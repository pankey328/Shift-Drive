const authService = require("../services/authService");
const { User, Hub } = require("../models");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendMail } = require('../utils/sendMail')

// Login User /api/auth/login
const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email?.toLowerCase().trim();

    if (!(email && password)) {
      return res
        .status(400)
        .json({ message: "Email and Password are required" });
    }

    const result = await authService.loginUser({ email, password });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Login Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || "Server error during login",
    });
  }
};

// Google OAuth Login /api/auth/google
const googleLogin = async (req, res) => {
  try {
    const { name, photo, uid } = req.body;
    const email = req.body.email?.toLowerCase().trim();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const result = await authService.googleLogin({ name, email, photo, uid });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Google Login Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || "Server error during Google login",
    });
  }
};

// Send OTP for registration verification /api/auth/send-otp
const sendOtp = async (req, res) => {
  try {
    const { name, password, role } = req.body;
    const email = req.body.email?.toLowerCase().trim();

    if (!(name && email && password)) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await authService.sendOtp({ name, email, password, role });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Send OTP Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || "Server error while sending OTP",
    });
  }
};

// Verify OTP and complete registration /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.body.email?.toLowerCase().trim();

    if (!(email && otp)) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const result = await authService.verifyOtp({ email, otp });
    return res.status(201).json(result);
  } catch (error) {
    console.error("Verify OTP Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || "Server error during OTP verification",
    });
  }
};

// Forget Password - Send OTP /api/auth/forget-password
const forget = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const result = await authService.forgetPassword({ email });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Forget Password Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || "Server error during forget password request",
    });
  }
};

// Verify Forget Password OTP and Reset Password /api/auth/verify-forget
const verifyForget = async (req, res) => {
  try {
    const { otp, newpassword, confirmpassword } = req.body;
    const email = req.body.email?.toLowerCase().trim();

    if (!(email && otp && newpassword && confirmpassword)) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await authService.verifyForgetPassword({
      email,
      otp,
      newpassword,
      confirmpassword,
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Verify Forget Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || "Server error during password reset",
    });
  }
};

// Reset Password for Logged-In User /api/auth/reset-password
const reset = async (req, res) => {
  try {
    const { password, newpassword, confirmpassword } = req.body;
    const email = req.body.email?.toLowerCase().trim();

    if (!(email && password && newpassword && confirmpassword)) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await authService.resetPassword({
      email,
      password,
      newpassword,
      confirmpassword,
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Reset Password Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || "Server error during password change",
    });
  }
};

// Get Current Logged-In User Profile /api/auth/me
const getMe = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const user = await authService.getUserProfile(userId);
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("GetMe Error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || "Server error fetching user profile",
    });
  }
};

const registerHubManager = async (req, res) => {
  try {
    const { name, email, phone, hub_id } = req.body;

    const hub = await Hub.findByPk(hub_id);
    if (!hub) return res.status(404).json({ message: "Hub not found." });

    const tempPassword = crypto.randomBytes(4).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const manager = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "HUB_ADMIN",
      requires_password_change: true,
    });

    hub.manager_id = manager.userId;
    await hub.save();

    const emailBody = `
      <p>Hello ${name},</p>
      <p>You have been appointed as the Hub Manager for <strong>${hub.name}</strong>.</p>
      <p>Your temporary login password is: <strong>${tempPassword}</strong></p>
      <p>Please log in to your dashboard. You will be required to set a permanent password immediately.</p>
    `;

    await sendMail(email, "Welcome to ShiftDrive - Account Setup", emailBody);

    return res.status(201).json({
      success: true,
      message: `Manager ${name} assigned to ${hub.name}. Temporary password sent via email.`,
      data: {
        userId: manager.userId,
        name: manager.name,
        email: manager.email,
        phone: manager.phone,
        temp_password_dev_only: tempPassword,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {
  login,
  googleLogin,
  sendOtp,
  verifyOtp,
  forget,
  verifyForget,
  reset,
  getMe,
  registerHubManager,
};
