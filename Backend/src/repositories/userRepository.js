const User = require("../models/User");

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

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  createGoogleUser,
  upsertUserOtp,
  markUserAsVerified,
  updateUserOtp,
  updateUserPassword,
};
