const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getLocalDashboard,
  handleRequestTransfer,
  handleStartTransfer,
  handleCompleteTransfer,
  handleCancelTransfer,
  handleListTransfers,
  handleWalkInBooking,
  handleLogLostItem,
  handleGetLostItems,
  handleSearchLostByBooking,
  handleClaimLostItem,
} = require("../controllers/hubAdminController");

router.use(protect);
router.use(authorize("HUB_ADMIN", "SUPERADMIN"));

// Hub Action Desk & Health Dashboard
router.get("/dashboard", getLocalDashboard);

// Fleet Rebalancing & Deadheading Transfers
router.post("/transfers", handleRequestTransfer);
router.get("/transfers", handleListTransfers);
router.patch("/transfers/:transferId/start", handleStartTransfer);
router.patch("/transfers/:transferId/complete", handleCompleteTransfer);
router.patch("/transfers/:transferId/cancel", handleCancelTransfer);

// Walk-In POS (Point of Sale Instant Rental)
router.post("/pos/book", handleWalkInBooking);

// Lost & Found Registry
router.post("/lost-found", upload.array("images", 3), handleLogLostItem);
router.get("/lost-found", handleGetLostItems);
router.get("/lost-found/booking/:bookingId", handleSearchLostByBooking);
router.patch("/lost-found/:itemId/claim", handleClaimLostItem);

module.exports = router;
