const { Op } = require("sequelize");
const {
  findBusyVehicleIds,
  createBookingRecord,
  findBookingById,
  updateBookingStatus,
} = require("../repositories/bookingRepository");
const {
  processFinancialMovement,
} = require("../repositories/walletRepository");
const { Vehicle, User } = require("../models");
const { differenceInDays } = require("date-fns");


const initiateBooking = async (
  userId,
  { vehicleId, pickupHubId, dropoffHubId, startTime, endTime }
) => {
  // Fetch the exact vehicle requested
  const requestedVehicle = await Vehicle.findByPk(vehicleId);
  if (!requestedVehicle) {
    const error = new Error("Requested vehicle not found");
    error.statusCode = 404;
    throw error;
  }

  // Calculate safety buffers (2 hours)
  const start = new Date(startTime);
  const end = new Date(endTime);
  const paddedStart = new Date(start.getTime() - 2 * 60 * 60 * 1000);
  const paddedEnd = new Date(end.getTime() + 2 * 60 * 60 * 1000);

  // Find ALL busy vehicle IDs
  const busyVehicleIds = await findBusyVehicleIds(paddedStart, paddedEnd);

  let assignedVehicle = null;

  // Is the requested exact physical car available?
  if (
    !busyVehicleIds.includes(requestedVehicle.vehicleId) &&
    requestedVehicle.status === "ACTIVE"
  ) {
    assignedVehicle = requestedVehicle;
  } else {
    // Look for another car of the EXACT SAME MAKE & MODEL at pickup hub
    assignedVehicle = await Vehicle.findOne({
      where: {
        current_hub_id: pickupHubId,
        make: requestedVehicle.make,
        model: requestedVehicle.model,
        status: "ACTIVE",
        ...(busyVehicleIds.length > 0 && {
          vehicleId: { [Op.notIn]: busyVehicleIds },
        }),
      },
    });
  }

  if (!assignedVehicle) {
    const error = new Error(
      `Sorry, all ${requestedVehicle.make} ${requestedVehicle.model}s are booked for these dates. Please select a different car.`
    );
    error.statusCode = 409;
    throw error;
  }

  // Calculate Pricing & Relocation Fee
  const rentalDays = differenceInDays(end, start) || 1;
  let totalPrice = rentalDays * parseFloat(assignedVehicle.base_daily_rate);
  let relocationFee = 0;

  if (pickupHubId !== dropoffHubId) {
    relocationFee = 500.0;
    totalPrice += relocationFee;
  }

  const lockedUntil = new Date(Date.now() + 5 * 60 * 1000);

  // Persist the Ghost Booking record via repository layer
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
  // Fetch booking via repository layer
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

  // Check if user wallet has sufficient balance
  const user = await User.findByPk(userId);
  if (parseFloat(user.wallet_balance) < parseFloat(booking.total_price)) {
    const error = new Error(
      `Insufficient wallet balance. Please top up ₹${booking.total_price - user.wallet_balance}`
    );
    error.statusCode = 402;
    throw error;
  }

  // Deduct from Wallet
  await processFinancialMovement({
    userId,
    amount: -Math.abs(booking.total_price),
    type: "BOOKING_CHARGE",
    description: `Payment for Booking ID: ${bookingId}`,
    bookingId,
  });

  // Mark status as CONFIRMED 
  return await updateBookingStatus(bookingId, "CONFIRMED");
};

const reportAccident = async (bookingId) => {
  const booking = await Booking.findByPk(bookingId);
  
  if (!booking || booking.status !== 'ACTIVE_TRIP') {
    throw new Error("Only active trips can be marked as an emergency.");
  }

  // Pause the clock to stop Late Fees
  booking.status = 'EMERGENCY_HOLD';
  await booking.save();

  // Immediately trigger the Maintenance Escalation 
  const { handleMaintenanceEscalation } = require('./escalationService');
  await handleMaintenanceEscalation(booking.vehicle_id);

  return { message: "Emergency reported. Late fees paused and future bookings rescued." };
};

module.exports = {
  initiateBooking,
  confirmBookingPayment,
  reportAccident,
};
