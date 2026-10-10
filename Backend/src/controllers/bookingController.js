const bookingService = require("../services/bookingService");

const createBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { vehicleId, pickupHubId, dropoffHubId, startTime, endTime } =
      req.body;

    if (!(vehicleId && pickupHubId && dropoffHubId && startTime && endTime)) {
      return res
        .status(400)
        .json({ message: "All booking details are required" });
    }

    const booking = await bookingService.initiateBooking(userId, req.body);
    return res.status(201).json({ success: true, data: booking });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ success: false, message: error.message });
  }
};

const payForBooking = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bookingId } = req.params;

    const confirmedBooking = await bookingService.confirmBookingPayment(
      userId,
      bookingId,
    );
    return res.status(200).json({ success: true, data: confirmedBooking });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ success: false, message: error.message });
  }
};

module.exports = {
  createBooking,
  payForBooking,
};
