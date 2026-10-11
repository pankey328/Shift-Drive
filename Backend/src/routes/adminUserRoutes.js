const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  fetchPendingKyc,
  handleReviewKyc,
  handleToggleAccount,
  fetchUsers,
} = require("../controllers/adminUserController");

router.use(protect);
router.use(authorize("SUPERADMIN"));

// List pending customer KYC submissions
router.get("/kyc/pending", fetchPendingKyc);

// Approve or reject customer KYC
router.patch("/:userId/kyc", handleReviewKyc);

// Blacklist, suspend or reactivate user account
router.patch("/:userId/status", handleToggleAccount);

// List all users with filtering
router.get("/", fetchUsers);

module.exports = router;
