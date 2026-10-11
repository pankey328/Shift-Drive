const { Inspection } = require("../models");

const createInspectionRecord = async (inspectionData) => {
  return await Inspection.create(inspectionData);
};

const getInspectionsByBooking = async (bookingId) => {
  return await Inspection.findAll({
    where: { booking_id: bookingId },
    order: [["createdAt", "ASC"]],
  });
};

module.exports = {
  createInspectionRecord,
  getInspectionsByBooking,
};
