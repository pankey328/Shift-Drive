const { Op } = require("sequelize");
const { Inspection, Booking, Vehicle, User } = require("../models");

const createInspectionRecord = async (inspectionData) => {
  return await Inspection.create(inspectionData);
};

const getInspectionsByBooking = async (bookingId) => {
  return await Inspection.findAll({
    where: { booking_id: bookingId },
    order: [["createdAt", "ASC"]],
  });
};

const findInspectionsByManager = async (managerId) => {
  return await Inspection.findAll({
    where: { admin_id: managerId },
    include: [
      {
        model: Booking,
        attributes: ["bookingId", "user_id", "start_time", "end_time", "status"],
        include: [
          {
            model: Vehicle,
            as: "Vehicle",
            attributes: ["vehicleId", "make", "model", "vehicle_class", "plate_number"],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

const findAllInspections = async (filters = {}) => {
  const where = {};
  if (filters.damageOnly === "true" || filters.damageOnly === true) {
    where.damage_flagged = true;
  }
  if (filters.severity && filters.severity !== "ALL") {
    where.damage_severity = filters.severity.toUpperCase();
  }
  if (filters.type && filters.type !== "ALL") {
    where.type = filters.type.toUpperCase();
  }

  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    where[Op.or] = [
      { booking_id: { [Op.like]: searchPattern } },
      { notes: { [Op.like]: searchPattern } },
      { "$Inspector.name$": { [Op.like]: searchPattern } },
      { "$Booking.Vehicle.plate_number$": { [Op.like]: searchPattern } },
      { "$Booking.Vehicle.model$": { [Op.like]: searchPattern } },
      { "$Booking.Customer.name$": { [Op.like]: searchPattern } },
    ];
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 12));
  const offset = (page - 1) * limit;

  const { count, rows } = await Inspection.findAndCountAll({
    where,
    distinct: true,
    include: [
      {
        model: User,
        as: "Inspector",
        attributes: ["userId", "name", "email", "phone"],
      },
      {
        model: Booking,
        attributes: [
          "bookingId",
          "user_id",
          "vehicle_id",
          "pickup_hub_id",
          "dropoff_hub_id",
          "start_time",
          "end_time",
          "status",
          "total_price",
        ],
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
              "gallery_urls",
            ],
          },
          {
            model: User,
            as: "Customer",
            attributes: ["userId", "name", "email", "phone", "kyc_status"],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return {
    inspections: rows,
    totalItems: count,
    totalPages: Math.ceil(count / limit) || 1,
    currentPage: page,
    limit,
  };
};

const findBookingAuditInspections = async (bookingId) => {
  return await Inspection.findAll({
    where: { booking_id: bookingId },
    include: [
      {
        model: User,
        as: "Inspector",
        attributes: ["userId", "name", "email", "phone"],
      },
    ],
    order: [["createdAt", "ASC"]],
  });
};

module.exports = {
  createInspectionRecord,
  getInspectionsByBooking,
  findInspectionsByManager,
  findAllInspections,
  findBookingAuditInspections,
};

