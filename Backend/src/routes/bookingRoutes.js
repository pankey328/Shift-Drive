const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  createBooking,
  payForBooking,
  reportEmergency,
  getEmergencyQueue,
  resolveEmergency,
  forceCancel,
  listAllBookings,
  getUserBookings,
  getBookingDetails,
  cancelBooking,
} = require("../controllers/bookingController");

router.use(protect);

// Admin emergency queue & incident control (Superadmin)
router.get("/admin/emergencies", authorize("SUPERADMIN"), getEmergencyQueue);
router.get("/admin/all", authorize("SUPERADMIN"), listAllBookings);
router.patch("/admin/:bookingId/resolve-emergency", authorize("SUPERADMIN"), resolveEmergency);
router.patch("/admin/:bookingId/force-cancel", authorize("SUPERADMIN"), forceCancel);

// Customer booking flows
router.get("/my-bookings", getUserBookings);
router.get("/:bookingId", getBookingDetails);
router.post("/initiate", createBooking);
router.post("/:bookingId/pay", payForBooking);
router.post("/:bookingId/cancel", cancelBooking);
router.post("/:bookingId/emergency", reportEmergency);

module.exports = router;


