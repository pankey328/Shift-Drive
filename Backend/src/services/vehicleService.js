const {
  createVehicle,
  getVehiclesByHub,
  updateVehicleGallery,
  getAvailableVehicles,
} = require("../repositories/vehicleRepository");
const { uploadImage } = require("../utils/cloudinary");

const addNewVehicle = async ({
  make,
  model,
  plate_number,
  base_daily_rate,
  current_hub_id,
}) => {
  return await createVehicle({
    make,
    model,
    plate_number,
    base_daily_rate,
    current_hub_id,
  });
};

const getHubFleet = async (hubId) => {
  return await getVehiclesByHub(hubId);
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
  return await updateVehicleGallery(vehicleId, uploadedUrls);
};

const searchAvailableFleet = async (hubId, startTime, endTime) => {
  if (!startTime || !endTime) {
    const error = new Error(
      "Start and End times are required to check availability",
    );
    error.statusCode = 400;
    throw error;
  }
  return await getAvailableVehicles(hubId, startTime, endTime);
};

module.exports = {
  addNewVehicle,
  getHubFleet,
  uploadGalleryImages,
  searchAvailableFleet,
};
