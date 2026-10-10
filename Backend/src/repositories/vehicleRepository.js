const { Op } = require("sequelize");
const { Vehicle, Booking } = require("../models");

const createVehicle = async (vehicleData) => {
  return await Vehicle.create(vehicleData);
};

const getVehiclesByHub = async (hubId) => {
  return await Vehicle.findAll({
    where: { current_hub_id: hubId },
    order: [["createdAt", "DESC"]],
  });
};

const updateVehicleGallery = async (vehicleId, imageUrls) => {
  const vehicle = await Vehicle.findByPk(vehicleId);

  if (!vehicle) {
    const error = new Error("Vehicle not found");
    error.statusCode = 404;
    throw error;
  }

  const existingUrls = Array.isArray(vehicle.gallery_urls) ? vehicle.gallery_urls : [];
  vehicle.gallery_urls = [...existingUrls, ...imageUrls];
  await vehicle.save();

  return vehicle;
};

const getAvailableVehicles = async (hubId, startTime, endTime) => {
  const busyBookings = await Booking.findAll({
    attributes: ["vehicle_id"],
    where: {
      status: { [Op.in]: ["PENDING_PAYMENT", "CONFIRMED", "ACTIVE_TRIP"] },
      start_time: { [Op.lt]: new Date(endTime) },
      end_time: { [Op.gt]: new Date(startTime) },
    },
    raw: true,
  });

  const busyVehicleIds = busyBookings.map((b) => b.vehicle_id);

  return await Vehicle.findAll({
    where: {
      current_hub_id: hubId,
      status: "ACTIVE",
      ...(busyVehicleIds.length > 0 && { vehicleId: { [Op.notIn]: busyVehicleIds } }),
    },
  });
};

module.exports = {
  createVehicle,
  getVehiclesByHub,
  updateVehicleGallery,
  getAvailableVehicles,
};
