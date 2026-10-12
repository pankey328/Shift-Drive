const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const {
  login,
  googleLogin,
  sendOtp,
  verifyOtp,
  forget,
  verifyForget,
  reset,
  getMe,
  setupPermanentPassword,
  registerHubManager,
  submitKyc,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
});

router.post("/login", login);
router.post("/google", googleLogin);
router.post("/send-otp", otpLimiter, sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/forget", otpLimiter, forget);
router.post("/verify-forget", verifyForget);
router.post("/reset", reset);
router.get("/me", protect, getMe);
router.post("/setup-password", protect, setupPermanentPassword);
router.post("/kyc", protect, upload.array("documents", 2), submitKyc);
router.post(
  "/register-manager",
  protect,
  authorize("SUPERADMIN"),
  registerHubManager,
);

module.exports = router;

