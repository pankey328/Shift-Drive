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
// List pending customer KYC submissions
router.get("/kyc/pending", authorize("SUPERADMIN"), fetchPendingKyc);

// Approve or reject customer KYC (Superadmin or Hub Manager at counter)
router.patch("/:userId/kyc", authorize("SUPERADMIN", "HUB_ADMIN"), handleReviewKyc);

// Blacklist, suspend or reactivate user account
router.patch("/:userId/status", authorize("SUPERADMIN"), handleToggleAccount);

// List all users with filtering
router.get("/", authorize("SUPERADMIN"), fetchUsers);

module.exports = router;
