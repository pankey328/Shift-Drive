const bcrypt = require("bcryptjs");
const userRepository = require("../repositories/userRepository");
const hubRepository = require("../repositories/hubRepository");
const { sendMail } = require("../utils/sendMail");

const getPendingKycList = async () => {
  return await userRepository.getUsersByKycStatus("PENDING");
};

const reviewKyc = async (userId, { status, rejectionReason = null }) => {
  const allowed = ["VERIFIED", "REJECTED"];
  if (!allowed.includes(status)) {
    const error = new Error("Invalid status. Must be VERIFIED or REJECTED.");
    error.statusCode = 400;
    throw error;
  }

  if (status === "REJECTED" && !rejectionReason) {
    const error = new Error("Rejection reason is required when rejecting KYC.");
    error.statusCode = 400;
    throw error;
  }

  const updatedUser = await userRepository.updateUserKyc(userId, {
    kyc_status: status,
    kyc_rejection_reason: status === "REJECTED" ? rejectionReason : null,
  });

  // Notify customer via email
  const subject =
    status === "VERIFIED"
      ? "ShiftDrive - KYC Documents Approved!"
      : "ShiftDrive - KYC Verification Requires Action";

  const html =
    status === "VERIFIED"
      ? `<p>Hello ${updatedUser.name},</p><p>Congratulations! Your driving license and KYC documents have been verified. You can now book and drive any vehicle in our fleet.</p>`
      : `<p>Hello ${updatedUser.name},</p><p>Your KYC submission was rejected for the following reason:</p><blockquote>${rejectionReason}</blockquote><p>Please log in and re-upload valid documents to unlock vehicle bookings.</p>`;

  try {
    await sendMail(updatedUser.email, subject, html);
  } catch (mailErr) {
    console.error("Failed to send KYC status email:", mailErr.message);
  }

  return updatedUser;
};

const toggleAccountStatus = async (userId, { is_active }) => {
  if (typeof is_active !== "boolean") {
    const error = new Error("is_active boolean field is required.");
    error.statusCode = 400;
    throw error;
  }

  return await userRepository.updateUserAccountStatus(userId, is_active);
};

const listUsers = async (filters) => {
  return await userRepository.getAllUsersList(filters);
};

const onboardStaff = async ({ name, email, phone, password, role, hubId }) => {
  if (!name || !email || !password) {
    const error = new Error("Name, email, and password are required.");
    error.statusCode = 400;
    throw error;
  }

  const existing = await userRepository.findUserByEmail(email);
  if (existing) {
    const error = new Error("User with this email already exists.");
    error.statusCode = 409;
    throw error;
  }

  const validRoles = ["HUB_ADMIN", "SUPERADMIN"];
  const finalRole = validRoles.includes(role) ? role : "HUB_ADMIN";

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await userRepository.createUser({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : null,
    password: hashedPassword,
    role: finalRole,
    isVerified: true,
    is_active: true,
    kyc_status: "VERIFIED",
  });

  let assignedHub = null;
  if (hubId && finalRole === "HUB_ADMIN") {
    assignedHub = await hubRepository.assignManagerToHub(hubId, newUser.userId);
  }

  return {
    userId: newUser.userId,
    name: newUser.name,
    email: newUser.email,
    phone: newUser.phone,
    role: newUser.role,
    is_active: newUser.is_active,
    assignedHub: assignedHub ? { hubId: assignedHub.hubId, name: assignedHub.name } : null,
  };
};

const changeUserRole = async (userId, { role, hubId }) => {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const validRoles = ["CUSTOMER", "HUB_ADMIN", "SUPERADMIN"];
  if (!validRoles.includes(role)) {
    const error = new Error("Invalid role specified. Must be CUSTOMER, HUB_ADMIN, or SUPERADMIN.");
    error.statusCode = 400;
    throw error;
  }

  user.role = role;
  await user.save();

  if (role === "HUB_ADMIN" && hubId) {
    await hubRepository.assignManagerToHub(hubId, user.userId);
  }

  return user;
};

const getUserAuditDetails = async (userId) => {
  const details = await userRepository.findUserAuditDetails(userId);
  if (!details) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }
  return details;
};

const updateUserProfile = async (userId, updateData) => {
  const User = require("../models/User");
  const Hub = require("../models/Hub");
  const { Op } = require("sequelize");

  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  // Update Name
  if (updateData.name && updateData.name.trim()) {
    user.name = updateData.name.trim();
  }

  // Update Email (check uniqueness)
  if (updateData.email && updateData.email.trim()) {
    const cleanEmail = updateData.email.trim().toLowerCase();
    if (cleanEmail !== user.email.toLowerCase()) {
      const existing = await User.findOne({
        where: {
          email: cleanEmail,
          userId: { [Op.ne]: userId },
        },
      });
      if (existing) {
        const error = new Error(`Email "${cleanEmail}" is already registered to another user.`);
        error.statusCode = 400;
        throw error;
      }
      user.email = cleanEmail;
    }
  }

  // Update Phone
  if (updateData.phone !== undefined) {
    user.phone = updateData.phone ? updateData.phone.trim() : null;
  }

  // Update Role
  if (updateData.role) {
    const validRoles = ["CUSTOMER", "HUB_ADMIN", "SUPERADMIN"];
    if (!validRoles.includes(updateData.role)) {
      const error = new Error("Invalid role specified. Must be CUSTOMER, HUB_ADMIN, or SUPERADMIN.");
      error.statusCode = 400;
      throw error;
    }
    user.role = updateData.role;
  }

  // Update KYC Status
  if (updateData.kyc_status) {
    const validKyc = ["PENDING", "VERIFIED", "REJECTED"];
    if (validKyc.includes(updateData.kyc_status)) {
      user.kyc_status = updateData.kyc_status;
    }
  }

  // Update Active/Suspended Status
  if (typeof updateData.is_active === "boolean") {
    user.is_active = updateData.is_active;
  }

  // Update Password if provided
  if (updateData.password && updateData.password.trim()) {
    user.password = await bcrypt.hash(updateData.password.trim(), 10);
  }

  await user.save();

  // Handle Hub assignment for HUB_ADMIN
  if (updateData.hubId !== undefined) {
    if (user.role === "HUB_ADMIN" && updateData.hubId) {
      await hubRepository.assignManagerToHub(updateData.hubId, user.userId);
    } else {
      // Unlink any hub managed by this user
      await Hub.update({ manager_id: null }, { where: { manager_id: user.userId } });
    }
  }

  const refreshedUser = await User.findByPk(userId, {
    attributes: ["userId", "name", "email", "phone", "role", "kyc_status", "is_active", "createdAt"],
    include: [{ model: Hub, as: "ManagedHub", attributes: ["hubId", "name", "city"] }],
  });

  return refreshedUser;
};

module.exports = {
  getPendingKycList,
  reviewKyc,
  toggleAccountStatus,
  listUsers,
  onboardStaff,
  changeUserRole,
  getUserAuditDetails,
  updateUserProfile,
};
