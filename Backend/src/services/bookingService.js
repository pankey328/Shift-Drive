const {
  findBusyVehicleIds,
  createBookingRecord,
  findBookingById,
  findBookingByIdWithDetails,
  updateBookingStatus,
  getEmergencyBookingsQueue,
  resolveEmergencyRecord,
  forceCancelBookingRecord,
  getAllBookingsAdmin,
} = require("../repositories/bookingRepository");
const {
  processFinancialMovement,
} = require("../repositories/walletRepository");
const vehicleRepository = require("../repositories/vehicleRepository");
const userRepository = require("../repositories/userRepository");
const hubRepository = require("../repositories/hubRepository");
const { sendMail } = require("../utils/sendMail");
const { getTimeString, isWithinOperatingHours } = require("../utils/timeUtils");
const { differenceInDays } = require("date-fns");

const initiateBooking = async (
  userId,
  { vehicleId, pickupHubId, dropoffHubId, startTime, endTime }
) => {
  // Validate time format and chronology
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    const error = new Error("Invalid start or end time format.");
    error.statusCode = 400;
    throw error;
  }

  if (end <= start) {
    const error = new Error("Dropoff time must be strictly after pickup time.");
    error.statusCode = 400;
    throw error;
  }

  // Validate Pickup Hub & Operating Hours
  const pickupHub = await hubRepository.findHubById(pickupHubId);
  if (!pickupHub) {
    const error = new Error("Pickup hub not found.");
    error.statusCode = 404;
    throw error;
  }
  if (pickupHub.status !== "ACTIVE") {
    const error = new Error(
      `Pickup hub (${pickupHub.name}) is currently ${pickupHub.status.toLowerCase()} and cannot accept bookings.`
    );
    error.statusCode = 400;
    throw error;
  }

  const pickupTimeStr = getTimeString(startTime);
  if (!isWithinOperatingHours(pickupTimeStr, pickupHub.opening_time, pickupHub.closing_time)) {
    const error = new Error(
      `Pickup hub (${pickupHub.name}) is closed at ${pickupTimeStr.slice(0, 5)}. Operating hours are ${pickupHub.opening_time.slice(0, 5)} to ${pickupHub.closing_time.slice(0, 5)}.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Validate Dropoff Hub & Operating Hours
  const dropoffHub =
    pickupHubId === dropoffHubId
      ? pickupHub
      : await hubRepository.findHubById(dropoffHubId);
  if (!dropoffHub) {
    const error = new Error("Dropoff hub not found.");
    error.statusCode = 404;
    throw error;
  }
  if (dropoffHub.status !== "ACTIVE") {
    const error = new Error(
      `Dropoff hub (${dropoffHub.name}) is currently ${dropoffHub.status.toLowerCase()} and cannot accept returns.`
    );
    error.statusCode = 400;
    throw error;
  }

  const dropoffTimeStr = getTimeString(endTime);
  if (!isWithinOperatingHours(dropoffTimeStr, dropoffHub.opening_time, dropoffHub.closing_time)) {
    const error = new Error(
      `Return hub (${dropoffHub.name}) is closed at ${dropoffTimeStr.slice(0, 5)}. Operating hours are ${dropoffHub.opening_time.slice(0, 5)} to ${dropoffHub.closing_time.slice(0, 5)}. Please select a return time during station operating hours.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Fetch requested vehicle 
  const requestedVehicle = await vehicleRepository.findVehicleById(vehicleId);
  if (!requestedVehicle) {
    const error = new Error("Requested vehicle not found");
    error.statusCode = 404;
    throw error;
  }

  // Calculate safety buffers (2 hours)
  const paddedStart = new Date(start.getTime() - 2 * 60 * 60 * 1000);
  const paddedEnd = new Date(end.getTime() + 2 * 60 * 60 * 1000);

  // Find busy vehicle IDs
  const busyVehicleIds = await findBusyVehicleIds(paddedStart, paddedEnd);

  let assignedVehicle = null;

  // Is requested physical car available?
  if (
    !busyVehicleIds.includes(requestedVehicle.vehicleId) &&
    requestedVehicle.status === "ACTIVE"
  ) {
    assignedVehicle = requestedVehicle;
  } else {
    // Search for another car with same make and model at pickup hub
    assignedVehicle = await vehicleRepository.findAlternativeVehicle({
      hubId: pickupHubId,
      make: requestedVehicle.make,
      model: requestedVehicle.model,
      busyVehicleIds,
    });
  }

  if (!assignedVehicle) {
    const error = new Error(
      `Sorry, all ${requestedVehicle.make} ${requestedVehicle.model}s are booked for these dates. Please select a different car.`
    );
    error.statusCode = 409;
    throw error;
  }

  // Calculate pricing & relocation fee
  const rentalDays = differenceInDays(end, start) || 1;
  let totalPrice = rentalDays * parseFloat(assignedVehicle.base_daily_rate);
  let relocationFee = 0;

  if (pickupHubId !== dropoffHubId) {
    relocationFee = 500.0;
    totalPrice += relocationFee;
  }

  const lockedUntil = new Date(Date.now() + 5 * 60 * 1000);

  return await createBookingRecord({
    user_id: userId,
    vehicle_id: assignedVehicle.vehicleId,
    pickup_hub_id: pickupHubId,
    dropoff_hub_id: dropoffHubId,
    start_time: start,
    end_time: end,
    total_price: totalPrice,
    relocation_fee: relocationFee,
    status: "PENDING_PAYMENT",
    locked_until: lockedUntil,
  });
};

const confirmBookingPayment = async (userId, bookingId) => {
  const booking = await findBookingById(bookingId);

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  if (booking.status !== "PENDING_PAYMENT") {
    const error = new Error("Booking is no longer pending or has expired");
    error.statusCode = 400;
    throw error;
  }

  // Check user balance via repository
  const user = await userRepository.findUserById(userId);
  if (parseFloat(user.wallet_balance) < parseFloat(booking.total_price)) {
    const error = new Error(
      `Insufficient wallet balance. Please top up ₹${booking.total_price - user.wallet_balance}`
    );
    error.statusCode = 402;
    throw error;
  }

  // Deduct from wallet
  await processFinancialMovement({
    userId,
    amount: -Math.abs(booking.total_price),
    type: "BOOKING_CHARGE",
    description: `Payment for Booking ID: ${bookingId}`,
    bookingId,
  });

  return await updateBookingStatus(bookingId, "CONFIRMED");
};

const reportAccident = async (bookingId) => {
  const booking = await findBookingById(bookingId);

  if (!booking || booking.status !== "ACTIVE_TRIP") {
    const error = new Error("Only active trips can be marked as an emergency.");
    error.statusCode = 400;
    throw error;
  }

  // Set status to EMERGENCY_HOLD
  booking.status = "EMERGENCY_HOLD";
  await booking.save();

  // Escalate maintenance
  const { handleMaintenanceEscalation } = require("./escalationService");
  await handleMaintenanceEscalation(booking.vehicle_id);

  return { message: "Emergency reported. Late fees paused and future bookings rescued." };
};

const fetchEmergencyIncidents = async () => {
  return await getEmergencyBookingsQueue();
};

const resolveEmergencyIncident = async (bookingId, { resolution, incidentNotes, refundAmount = 0 }) => {
  const allowed = ["COMPLETED", "CANCELLED"];
  if (!allowed.includes(resolution)) {
    const error = new Error("Invalid resolution. Must be COMPLETED or CANCELLED.");
    error.statusCode = 400;
    throw error;
  }

  const booking = await findBookingByIdWithDetails(bookingId);
  if (!booking) {
    const error = new Error("Booking not found.");
    error.statusCode = 404;
    throw error;
  }

  if (booking.status !== "EMERGENCY_HOLD") {
    const error = new Error("Only bookings in EMERGENCY_HOLD status can be resolved here.");
    error.statusCode = 400;
    throw error;
  }

  // Update booking record
  const resolved = await resolveEmergencyRecord(bookingId, {
    status: resolution,
    incident_notes: incidentNotes || "Incident resolved by superadmin.",
  });

  // If refund requested, credit customer wallet
  const refundVal = parseFloat(refundAmount);
  if (refundVal > 0) {
    await processFinancialMovement({
      userId: booking.user_id,
      amount: Math.abs(refundVal),
      type: "REFUND",
      description: `Emergency incident refund adjustment for Booking ID: ${bookingId}`,
      bookingId,
    });
  }

  // Send email notification to user
  if (booking.Customer && booking.Customer.email) {
    const emailBody = `
      <p>Hello ${booking.Customer.name},</p>
      <p>Your emergency incident for booking <strong>#${bookingId}</strong> has been resolved by our fleet command team.</p>
      <p><strong>Outcome:</strong> ${resolution}</p>
      ${incidentNotes ? `<p><strong>Notes:</strong> ${incidentNotes}</p>` : ""}
      ${refundVal > 0 ? `<p><strong>Wallet Refund Credited:</strong> ₹${refundVal.toFixed(2)}</p>` : ""}
      <p>Thank you for your patience and cooperation.</p>
    `;
    try {
      await sendMail(booking.Customer.email, "ShiftDrive Incident Command Resolution", emailBody);
    } catch (err) {
      console.error("Failed to send incident resolution email:", err.message);
    }
  }

  return resolved;
};

const adminForceCancelBooking = async (bookingId, { cancellationReason, refundToWallet = false }) => {
  const booking = await findBookingByIdWithDetails(bookingId);
  if (!booking) {
    const error = new Error("Booking not found.");
    error.statusCode = 404;
    throw error;
  }

  if (["COMPLETED", "CANCELLED"].includes(booking.status)) {
    const error = new Error(`Cannot cancel a booking with status ${booking.status}.`);
    error.statusCode = 400;
    throw error;
  }

  // Release vehicle if vehicle is not damaged
  if (booking.Vehicle && booking.Vehicle.status === "IN_USE") {
    await vehicleRepository.updateVehicleStatus(booking.Vehicle.vehicleId, "ACTIVE");
  }

  // Process refund if requested and booking had already been charged
  if (refundToWallet && ["CONFIRMED", "ACTIVE_TRIP", "EMERGENCY_HOLD"].includes(booking.status)) {
    const refundAmount = parseFloat(booking.total_price);
    if (refundAmount > 0) {
      await processFinancialMovement({
        userId: booking.user_id,
        amount: Math.abs(refundAmount),
        type: "REFUND",
        description: `Admin forced cancellation refund for Booking ID: ${bookingId}`,
        bookingId,
      });
    }
  }

  return await forceCancelBookingRecord(bookingId, {
    cancellation_reason: cancellationReason || "Admin administrative override",
    incident_notes: "Booking force-cancelled by Superadmin.",
  });
};

const fetchAdminBookings = async (filters) => {
  return await getAllBookingsAdmin(filters);
};

module.exports = {
  initiateBooking,
  confirmBookingPayment,
  reportAccident,
  fetchEmergencyIncidents,
  resolveEmergencyIncident,
  adminForceCancelBooking,
  fetchAdminBookings,
};

