const vehicleRepository = require("../repositories/vehicleRepository");
const hubRepository = require("../repositories/hubRepository");
const { uploadImage } = require("../utils/cloudinary");
const { getTimeString, isWithinOperatingHours } = require("../utils/timeUtils");

const addNewVehicle = async ({
  make,
  model,
  plate_number,
  base_daily_rate,
  current_hub_id,
  vehicle_class = "SEDAN",
}) => {
  return await vehicleRepository.createVehicle({
    make,
    model,
    plate_number,
    base_daily_rate,
    current_hub_id,
    vehicle_class,
  });
};

const getHubFleet = async (hubId) => {
  return await vehicleRepository.getVehiclesByHub(hubId);
};

const uploadGalleryImages = async (vehicleId, files) => {
  if (!files || files.length === 0) {
    const error = new Error("No images provided for upload");
    error.statusCode = 400;
    throw error;
  }

  // Pass the Multer files to Cloudinary
  const uploadedUrls = await uploadImage(files);

  // Save returned URLs to the database
  return await vehicleRepository.updateVehicleGallery(vehicleId, uploadedUrls);
};

const searchAvailableFleet = async (hubId, startTime, endTime) => {
  if (!startTime || !endTime) {
    const error = new Error(
      "Start and End times are required to check availability",
    );
    error.statusCode = 400;
    throw error;
  }

  const hub = await hubRepository.findHubById(hubId);
  if (!hub) {
    const error = new Error("Hub not found.");
    error.statusCode = 404;
    throw error;
  }

  if (hub.status !== "ACTIVE") {
    const error = new Error(
      `Hub (${hub.name}) is currently ${hub.status.toLowerCase()} and cannot accept bookings.`
    );
    error.statusCode = 400;
    throw error;
  }

  const pickupTimeStr = getTimeString(startTime);
  if (!isWithinOperatingHours(pickupTimeStr, hub.opening_time, hub.closing_time)) {
    const error = new Error(
      `Hub (${hub.name}) is closed at ${pickupTimeStr.slice(0, 5)}. Operating hours are ${hub.opening_time.slice(0, 5)} to ${hub.closing_time.slice(0, 5)}.`
    );
    error.statusCode = 400;
    throw error;
  }

  return await vehicleRepository.getAvailableVehicles(hubId, startTime, endTime);
};

const changeVehicleStatus = async (vehicleId, status) => {
  const validStatuses = ["ACTIVE", "IN_USE", "MAINTENANCE", "RETIRED"];
  if (!validStatuses.includes(status)) {
    const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const vehicle = await vehicleRepository.findVehicleById(vehicleId);
  if (!vehicle) {
    const error = new Error("Vehicle not found.");
    error.statusCode = 404;
    throw error;
  }

  return await vehicleRepository.updateVehicleStatus(vehicleId, status);
};

const transferVehicleToHub = async (vehicleId, targetHubId) => {
  const vehicle = await vehicleRepository.findVehicleById(vehicleId);
  if (!vehicle) {
    const error = new Error("Vehicle not found.");
    error.statusCode = 404;
    throw error;
  }

  if (vehicle.status === "IN_USE") {
    const error = new Error("Cannot transfer vehicle while it is currently in an active trip (IN_USE).");
    error.statusCode = 400;
    throw error;
  }

  const hub = await hubRepository.findHubById(targetHubId);
  if (!hub) {
    const error = new Error("Target destination hub not found.");
    error.statusCode = 404;
    throw error;
  }

  return await vehicleRepository.transferVehicleHub(vehicleId, targetHubId);
};

const updateVehicleInfo = async (vehicleId, updateData) => {
  const vehicle = await vehicleRepository.findVehicleById(vehicleId);
  if (!vehicle) {
    const error = new Error("Vehicle not found.");
    error.statusCode = 404;
    throw error;
  }

  return await vehicleRepository.updateVehicleRecord(vehicleId, updateData);
};

const getHubFleetDetails = async (hubId) => {
  return await vehicleRepository.getHubFleetDetailsWithSummary(hubId);
};

const getVehicleDetails = async (vehicleId) => {
  const vehicle = await vehicleRepository.findVehicleById(vehicleId);
  if (!vehicle) {
    const error = new Error("Vehicle not found.");
    error.statusCode = 404;
    throw error;
  }
  return vehicle;
};

module.exports = {
  addNewVehicle,
  getHubFleet,
  uploadGalleryImages,
  searchAvailableFleet,
  changeVehicleStatus,
  transferVehicleToHub,
  updateVehicleInfo,
  getHubFleetDetails,
  getVehicleDetails,
};


