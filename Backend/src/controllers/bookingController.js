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

const reportEmergency = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const result = await bookingService.reportAccident(bookingId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const getEmergencyQueue = async (req, res) => {
  try {
    const emergencies = await bookingService.fetchEmergencyIncidents();
    return res.status(200).json({
      success: true,
      total_emergencies: emergencies.length,
      data: emergencies,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const resolveEmergency = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { resolution, incidentNotes, refundAmount } = req.body;

    const updatedBooking = await bookingService.resolveEmergencyIncident(bookingId, {
      resolution,
      incidentNotes,
      refundAmount,
    });

    return res.status(200).json({
      success: true,
      message: `Emergency incident resolved with outcome: ${resolution}.`,
      data: updatedBooking,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const forceCancel = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { cancellationReason, refundToWallet } = req.body;

    const cancelledBooking = await bookingService.adminForceCancelBooking(bookingId, {
      cancellationReason,
      refundToWallet: refundToWallet === true || refundToWallet === "true",
    });

    return res.status(200).json({
      success: true,
      message: "Booking has been force-cancelled by administrator.",
      data: cancelledBooking,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const listAllBookings = async (req, res) => {
  try {
    const { status, userId, vehicleId } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (userId) filters.userId = userId;
    if (vehicleId) filters.vehicleId = vehicleId;

    const bookings = await bookingService.fetchAdminBookings(filters);
    return res.status(200).json({
      success: true,
      total: bookings.length,
      data: bookings,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { status } = req.query;

    const bookings = await bookingService.fetchUserBookings(userId, { status });
    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const getBookingDetails = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const userRole = req.user.role;
    const { bookingId } = req.params;

    const booking = await bookingService.fetchUserBookingDetails(
      userId,
      userRole,
      bookingId
    );
    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { bookingId } = req.params;
    const { cancellationReason } = req.body;

    const cancelledBooking = await bookingService.cancelCustomerBooking(
      userId,
      bookingId,
      { cancellationReason }
    );

    return res.status(200).json({
      success: true,
      message:
        "Booking cancelled successfully. Any payments have been refunded to your wallet.",
      data: cancelledBooking,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

module.exports = {
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
};


