const { Booking } = require("../models");
const { Op } = require("sequelize");

// Check if a specific vehicle is available for given start/end times
const checkVehicleAvailability = async (vehicleId, startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const paddedStart = new Date(start.getTime() - 2 * 60 * 60 * 1000);
  const paddedEnd = new Date(end.getTime() + 2 * 60 * 60 * 1000);

  const conflict = await Booking.findOne({
    where: {
      vehicle_id: vehicleId,
      status: { [Op.in]: ["PENDING_PAYMENT", "CONFIRMED", "ACTIVE_TRIP"] },
      start_time: { [Op.lt]: paddedEnd },
      end_time: { [Op.gt]: paddedStart },
    },
  });

  return conflict === null;
};

// Find all busy vehicle IDs during a padded time window
const findBusyVehicleIds = async (paddedStart, paddedEnd) => {
  const busyBookings = await Booking.findAll({
    attributes: ["vehicle_id"],
    where: {
      status: { [Op.in]: ["PENDING_PAYMENT", "CONFIRMED", "ACTIVE_TRIP"] },
      start_time: { [Op.lt]: paddedEnd },
      end_time: { [Op.gt]: paddedStart },
    },
    raw: true,
  });

  return busyBookings.map((b) => b.vehicle_id);
};

// Create a new booking record
const createBookingRecord = async (bookingData) => {
  return await Booking.create(bookingData);
};

// Find booking by primary key
const findBookingById = async (bookingId) => {
  return await Booking.findByPk(bookingId);
};

// Update booking status
const updateBookingStatus = async (bookingId, status) => {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  booking.status = status;
  await booking.save();
  return booking;
};

// Get expired ghost bookings created before cutoff time
const getGhostBookings = async (cutoffTime) => {
  return await Booking.findAll({
    where: {
      status: "PENDING_PAYMENT",
      createdAt: { [Op.lt]: cutoffTime },
    },
  });
};

module.exports = {
  checkVehicleAvailability,
  findBusyVehicleIds,
  createBookingRecord,
  findBookingById,
  updateBookingStatus,
  getGhostBookings,
};
