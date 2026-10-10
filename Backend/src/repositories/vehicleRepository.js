const { Vehicle } = require("../models");

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

module.exports = {
  createVehicle,
  getVehiclesByHub,
  updateVehicleGallery,
};
