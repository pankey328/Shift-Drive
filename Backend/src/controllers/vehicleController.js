const vehicleService = require("../services/vehicleService");

const addVehicle = async (req, res) => {
  try {
    const { make, model, plate_number, base_daily_rate, current_hub_id } = req.body;

    if (!(make && model && plate_number && base_daily_rate && current_hub_id)) {
      return res
        .status(400)
        .json({
          message: "All vehicle details including current_hub_id are required",
        });
    }

    const vehicle = await vehicleService.addNewVehicle({
      make,
      model,
      plate_number,
      base_daily_rate,
      current_hub_id,
    });

    return res.status(201).json({ success: true, data: vehicle });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ success: false, message: error.message });
  }
};

const getVehicles = async (req, res) => {
  try {
    const { hubId } = req.params;

    if (!hubId) {
      return res.status(400).json({ message: "Hub ID is required" });
    }

    const vehicles = await vehicleService.getHubFleet(hubId);
    return res.status(200).json({ success: true, data: vehicles });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ success: false, message: error.message });
  }
};

const uploadGallery = async (req, res) => {
  try {
    const { id } = req.params; // Vehicle ID
    const files = req.files; 

    const updatedVehicle = await vehicleService.uploadGalleryImages(id, files);

    return res.status(200).json({
      success: true,
      message: "Images successfully compressed and uploaded",
      data: updatedVehicle,
    });
  } catch (error) {
    console.error("Upload Gallery Error:", error);
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ success: false, message: error.message });
  }
};

module.exports = {
  addVehicle,
  getVehicles,
  uploadGallery,
};
