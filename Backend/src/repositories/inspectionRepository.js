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

const findAllInspections = async (whereClause = {}) => {
  return await Inspection.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: "Inspector",
        attributes: ["userId", "name", "email", "phone"],
      },
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

module.exports = {
  createInspectionRecord,
  getInspectionsByBooking,
  findInspectionsByManager,
  findAllInspections,
};

