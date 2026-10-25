const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  fetchPendingKyc,
  handleReviewKyc,
  handleToggleAccount,
  fetchUsers,
  handleOnboardStaff,
  handleUpdateUserRole,
  handleGetUserDetails,
  handleUpdateUserProfile,
} = require("../controllers/adminUserController");

router.use(protect);

// List pending customer KYC submissions
router.get("/kyc/pending", authorize("SUPERADMIN"), fetchPendingKyc);

// Approve or reject customer KYC (Superadmin or Hub Manager at counter)
router.patch("/:userId/kyc", authorize("SUPERADMIN", "HUB_ADMIN"), handleReviewKyc);

// Onboard new Hub Manager or Staff
router.post("/onboard", authorize("SUPERADMIN"), handleOnboardStaff);

// Blacklist, suspend or reactivate user account
router.patch("/:userId/status", authorize("SUPERADMIN"), handleToggleAccount);

// Promote or change user role
router.patch("/:userId/role", authorize("SUPERADMIN"), handleUpdateUserRole);

// Get complete audit profile for user
router.get("/:userId/details", authorize("SUPERADMIN"), handleGetUserDetails);

// Full profile update for user / hub manager
router.put("/:userId", authorize("SUPERADMIN"), handleUpdateUserProfile);
router.patch("/:userId", authorize("SUPERADMIN"), handleUpdateUserProfile);

// List all users with filtering
router.get("/", authorize("SUPERADMIN"), fetchUsers);

module.exports = router;
