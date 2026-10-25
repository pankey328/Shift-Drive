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

// Customer booking flows (Strictly CUSTOMER role)
router.get("/my-bookings", authorize("CUSTOMER"), getUserBookings);
router.get("/:bookingId", getBookingDetails);
router.post("/initiate", authorize("CUSTOMER"), createBooking);
router.post("/:bookingId/pay", authorize("CUSTOMER"), payForBooking);
router.post("/:bookingId/cancel", authorize("CUSTOMER"), cancelBooking);
router.post("/:bookingId/emergency", authorize("CUSTOMER"), reportEmergency);

module.exports = router;


