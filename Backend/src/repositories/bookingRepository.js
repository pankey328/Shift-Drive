const { Booking, User, Vehicle, Hub, Inspection } = require("../models");
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

  return busyBookings.map((b) => b.vehicle_id).filter(Boolean);
};

// Create a new booking record
const createBookingRecord = async (bookingData) => {
  return await Booking.create(bookingData);
};

// Find booking by primary key
const findBookingById = async (bookingId) => {
  return await Booking.findByPk(bookingId);
};

// Find booking with complete related models
const findBookingByIdWithDetails = async (bookingId) => {
  return await Booking.findByPk(bookingId, {
    include: [
      {
        model: User,
        as: "Customer",
        attributes: ["userId", "name", "email", "phone", "wallet_balance", "kyc_status"],
      },
      {
        model: Vehicle,
        as: "Vehicle",
        attributes: ["vehicleId", "make", "model", "vehicle_class", "plate_number", "status", "current_hub_id"],
      },
      {
        model: Hub,
        as: "PickupHub",
        attributes: ["hubId", "name", "city", "address"],
      },
      {
        model: Hub,
        as: "DropoffHub",
        attributes: ["hubId", "name", "city", "address"],
      },
    ],
  });
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

// Fetch all bookings in EMERGENCY_HOLD queue
const getEmergencyBookingsQueue = async () => {
  return await Booking.findAll({
    where: { status: "EMERGENCY_HOLD" },
    include: [
      {
        model: User,
        as: "Customer",
        attributes: ["userId", "name", "email", "phone", "wallet_balance", "kyc_status"],
      },
      {
        model: Vehicle,
        as: "Vehicle",
        attributes: ["vehicleId", "make", "model", "vehicle_class", "plate_number", "status"],
      },
      {
        model: Hub,
        as: "PickupHub",
        attributes: ["hubId", "name", "city", "address"],
      },
      {
        model: Hub,
        as: "DropoffHub",
        attributes: ["hubId", "name", "city", "address"],
      },
    ],
    order: [["updatedAt", "DESC"]],
  });
};

// Resolve an emergency incident
const resolveEmergencyRecord = async (bookingId, { status, incident_notes }) => {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  booking.status = status;
  if (incident_notes) {
    booking.incident_notes = incident_notes;
  }
  await booking.save();
  return booking;
};

// Force cancel a booking with audit trail
const forceCancelBookingRecord = async (bookingId, { cancellation_reason, incident_notes }) => {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  booking.status = "CANCELLED";
  if (cancellation_reason) booking.cancellation_reason = cancellation_reason;
  if (incident_notes) booking.incident_notes = incident_notes;
  await booking.save();
  return booking;
};

// List all bookings for admin with filters
const getAllBookingsAdmin = async (filters = {}) => {
  const where = {};
  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.userId) where.user_id = filters.userId;
  if (filters.vehicleId) where.vehicle_id = filters.vehicleId;

  return await Booking.findAll({
    where,
    include: [
      {
        model: User,
        as: "Customer",
        attributes: ["userId", "name", "email", "phone"],
      },
      {
        model: Vehicle,
        as: "Vehicle",
        attributes: ["vehicleId", "make", "model", "plate_number", "status"],
      },
      {
        model: Hub,
        as: "PickupHub",
        attributes: ["hubId", "name", "city"],
      },
      {
        model: Hub,
        as: "DropoffHub",
        attributes: ["hubId", "name", "city"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

// List bookings for a specific customer with complete details
const getUserBookings = async (userId, filters = {}) => {
  const where = { user_id: userId };
  if (filters.status) where.status = filters.status;

  return await Booking.findAll({
    where,
    include: [
      {
        model: Vehicle,
        as: "Vehicle",
        attributes: [
          "vehicleId",
          "make",
          "model",
          "vehicle_class",
          "plate_number",
          "status",
          "gallery_urls",
          "base_daily_rate",
        ],
      },
      {
        model: Hub,
        as: "PickupHub",
        attributes: [
          "hubId",
          "name",
          "city",
          "address",
          "opening_time",
          "closing_time",
        ],
      },
      {
        model: Hub,
        as: "DropoffHub",
        attributes: [
          "hubId",
          "name",
          "city",
          "address",
          "opening_time",
          "closing_time",
        ],
      },
      {
        model: Inspection,
        as: "Inspections",
        attributes: [
          "inspectionId",
          "type",
          "photo_urls",
          "notes",
          "damage_flagged",
          "damage_severity",
          "createdAt",
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

// Customer cancels booking
const cancelBookingByCustomer = async (bookingId, cancellationReason) => {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  booking.status = "CANCELLED";
  booking.cancellation_reason = cancellationReason || "Cancelled by customer";
  await booking.save();
  return booking;
};

module.exports = {
  checkVehicleAvailability,
  findBusyVehicleIds,
  createBookingRecord,
  findBookingById,
  findBookingByIdWithDetails,
  updateBookingStatus,
  getGhostBookings,
  getEmergencyBookingsQueue,
  resolveEmergencyRecord,
  forceCancelBookingRecord,
  getAllBookingsAdmin,
  getUserBookings,
  cancelBookingByCustomer,
};


