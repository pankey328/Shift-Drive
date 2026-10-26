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
    const { notes } = req.body || {};
    const result = await bookingService.reportAccident(bookingId, notes);
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
    const { status, userId, vehicleId, hubId, search, q, sortBy, order, page, limit } = req.query;
    const filters = {};
    if (status && status !== "ALL") filters.status = status;
    if (userId) filters.userId = userId;
    if (vehicleId) filters.vehicleId = vehicleId;
    if (hubId && hubId !== "ALL") filters.hubId = hubId;
    if (search || q) filters.search = (search || q).trim();
    if (sortBy) filters.sortBy = sortBy;
    if (order) filters.order = order;
    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);

    const result = await bookingService.fetchAdminBookings(filters);
    return res.status(200).json({
      success: true,
      total: result.totalItems,
      data: result.bookings,
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        limit: result.limit,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { status, page, limit } = req.query;

    const result = await bookingService.fetchUserBookings(userId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return res.status(200).json({
      success: true,
      count: result.totalItems,
      data: result.bookings,
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        limit: result.limit,
      },
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

    const result = await bookingService.cancelCustomerBooking(
      userId,
      bookingId,
      { cancellationReason }
    );

    const message = result.isProrated
      ? `Booking cancelled. Prorated refund of ₹${result.refundAmount.toFixed(2)} credited to your wallet (₹${result.deductedAmount.toFixed(2)} deducted for elapsed days).`
      : "Booking cancelled successfully. 100% of your payment has been refunded to your wallet.";

    return res.status(200).json({
      success: true,
      message,
      data: result.booking,
      refundAmount: result.refundAmount,
      isProrated: result.isProrated,
      deductedAmount: result.deductedAmount,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const markRunningLateController = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { bookingId } = req.params;

    const result = await bookingService.markRunningLate(userId, bookingId);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.booking,
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
  markRunningLateController,
};


