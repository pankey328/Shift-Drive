const { Op } = require("sequelize");
const { User, Hub, Booking, Vehicle } = require("../models");

const findUserByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

const findUserById = async (userId) => {
  return await User.findByPk(userId, {
    attributes: { exclude: ["password", "otp", "otpExpiry"] },
  });
};

const createUser = async (userData) => {
  return await User.create(userData);
};

const createGoogleUser = async ({ name, email, role, googleId, photo }) => {
  return await User.create({
    name,
    email,
    role: role || "CUSTOMER",
    googleId,
    photo,
    provider: "google",
    isVerified: true,
  });
};

const upsertUserOtp = async ({
  name,
  email,
  password,
  role,
  otp,
  otpExpiry,
}) => {
  const existingUser = await User.findOne({ where: { email } });

  if (existingUser) {
    existingUser.name = name;
    existingUser.password = password;
    existingUser.role = role || "CUSTOMER";
    existingUser.otp = otp;
    existingUser.otpExpiry = otpExpiry;
    existingUser.isVerified = false;
    await existingUser.save();
    return existingUser;
  }

  return await User.create({
    name,
    email,
    password,
    role: role || "CUSTOMER",
    otp,
    otpExpiry,
    isVerified: false,
    provider: "local",
  });
};

const markUserAsVerified = async (user) => {
  user.isVerified = true;
  user.otp = null;
  user.otpExpiry = null;
  await user.save();
  return user;
};

const updateUserOtp = async (user, otp, otpExpiry) => {
  user.otp = otp;
  user.otpExpiry = otpExpiry;
  await user.save();
  return user;
};

const updateUserPassword = async (user, hashedPassword) => {
  user.password = hashedPassword;
  user.otp = null;
  user.otpExpiry = null;
  await user.save();
  return user;
};

// Fetch users by KYC status
const getUsersByKycStatus = async (kycStatus) => {
  return await User.findAll({
    where: { kyc_status: kycStatus },
    attributes: { exclude: ["password", "otp", "otpExpiry"] },
    order: [["createdAt", "ASC"]],
  });
};

// Update user's KYC verification status
const updateUserKyc = async (userId, { kyc_status, kyc_rejection_reason = null }) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  user.kyc_status = kyc_status;
  user.kyc_rejection_reason = kyc_rejection_reason;
  await user.save();
  return user;
};

// Toggle user account activation (block/unblock)
const updateUserAccountStatus = async (userId, is_active) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  user.is_active = is_active;
  await user.save();
  return user;
};

// List users with search, filtering, sorting, and pagination
const getAllUsersList = async (filters = {}) => {
  const where = {};
  if (filters.role) where.role = filters.role;
  if (filters.is_active !== undefined) where.is_active = filters.is_active;
  if (filters.kyc_status) where.kyc_status = filters.kyc_status;

  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    where[Op.or] = [
      { name: { [Op.like]: searchPattern } },
      { email: { [Op.like]: searchPattern } },
      { phone: { [Op.like]: searchPattern } },
    ];
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const validSortColumns = ["createdAt", "name", "email", "wallet_balance", "kyc_status", "role"];
  const sortBy = validSortColumns.includes(filters.sortBy) ? filters.sortBy : "createdAt";
  const order = filters.order && filters.order.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ["password", "otp", "otpExpiry"] },
    include: [
      {
        model: Hub,
        as: "ManagedHub",
        attributes: ["hubId", "name", "city", "status"],
      },
    ],
    order: [[sortBy, order]],
    limit,
    offset,
  });

  return {
    users: rows,
    totalItems: count,
    totalPages: Math.ceil(count / limit) || 1,
    currentPage: page,
    limit,
  };
};

const findUserAuditDetails = async (userId) => {
  return await User.findByPk(userId, {
    attributes: { exclude: ["password", "otp", "otpExpiry"] },
    include: [
      {
        model: Hub,
        as: "ManagedHub",
        attributes: ["hubId", "name", "city", "address", "status"],
      },
      {
        model: Booking,
        as: "Bookings",
        attributes: ["bookingId", "status", "start_time", "end_time", "total_price", "createdAt"],
        limit: 10,
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: Vehicle,
            as: "Vehicle",
            attributes: ["vehicleId", "make", "model", "plate_number", "gallery_urls"],
          },
        ],
      },
    ],
  });
};

// Register hub manager user
const createHubManager = async (managerData) => {
  return await User.create(managerData);
};

// Update permanent password and remove temporary password flag
const updatePermanentPassword = async (userId, hashedPassword) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  user.password = hashedPassword;
  user.requires_password_change = false;
  await user.save();
  return user;
};

// Customer uploads driving license / KYC document
const updateUserKycDocument = async (userId, documentUrl) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  user.kyc_document_url = documentUrl;
  user.kyc_status = "PENDING";
  user.kyc_rejection_reason = null;
  await user.save();
  return user;
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  createGoogleUser,
  upsertUserOtp,
  markUserAsVerified,
  updateUserOtp,
  updateUserPassword,
  getUsersByKycStatus,
  updateUserKyc,
  updateUserKycDocument,
  updateUserAccountStatus,
  getAllUsersList,
  createHubManager,
  updatePermanentPassword,
  findUserAuditDetails,
};


