const {
  createVehicle,
  getVehiclesByHub,
  updateVehicleGallery,
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

module.exports = {
  addNewVehicle,
  getHubFleet,
  uploadGalleryImages,
};
