const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createBooking,
  payForBooking,
} = require("../controllers/bookingController");

router.use(protect);

// User locks the car and calculates total
router.post("/initiate", createBooking);

// User confirms and wallet is deducted
router.post("/:bookingId/pay", payForBooking);

module.exports = router;
