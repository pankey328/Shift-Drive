const vehicleService = require("../services/vehicleService");

const addVehicle = async (req, res) => {
  try {
    const {
      make,
      model,
      plate_number,
      base_daily_rate,
      current_hub_id,
      vehicle_class,
      seats,
      fuel_type,
      transmission,
    } = req.body;

    if (!(make && model && plate_number && base_daily_rate && current_hub_id)) {
      return res.status(400).json({
        message: "All vehicle details including current_hub_id are required",
      });
    }

    const vehicle = await vehicleService.addNewVehicle({
      make,
      model,
      plate_number,
      base_daily_rate,
      current_hub_id,
      vehicle_class,
      seats,
      fuel_type,
      transmission,
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

const searchVehicles = async (req, res) => {
  try {
    const { hubId } = req.params;
    const { startTime, endTime } = req.query;

    const vehicles = await vehicleService.searchAvailableFleet(
      hubId,
      startTime,
      endTime,
    );
    return res.status(200).json({ success: true, data: vehicles });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ success: false, message: error.message });
  }
};

const getHubFleetDetails = async (req, res) => {
  try {
    const { hubId } = req.params;
    const result = await vehicleService.getHubFleetDetails(hubId);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleUpdateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      service_category,
      service_notes,
      estimated_ready_date,
      mechanic_assigned,
    } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required." });
    }

    const updatedVehicle = await vehicleService.changeVehicleStatus(id, status, {
      service_category,
      service_notes,
      estimated_ready_date,
      mechanic_assigned,
    });
    return res.status(200).json({
      success: true,
      message: `Vehicle status changed to ${status}.`,
      data: updatedVehicle,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleTransferHub = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetHubId } = req.body;

    if (!targetHubId) {
      return res.status(400).json({ success: false, message: "targetHubId is required." });
    }

    const updatedVehicle = await vehicleService.transferVehicleToHub(id, targetHubId);
    return res.status(200).json({
      success: true,
      message: "Vehicle successfully transferred to new hub.",
      data: updatedVehicle,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const handleUpdateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedVehicle = await vehicleService.updateVehicleInfo(id, req.body);
    return res.status(200).json({
      success: true,
      message: "Vehicle details updated successfully.",
      data: updatedVehicle,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await vehicleService.getVehicleDetails(id);
    return res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const getAllVehicles = async (req, res) => {
  try {
    const { category, hubId } = req.query;
    const vehicles = await vehicleService.getAllFleet({ category, hubId });
    return res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

module.exports = {
  addVehicle,
  getVehicles,
  uploadGallery,
  searchVehicles,
  getHubFleetDetails,
  handleUpdateStatus,
  handleTransferHub,
  handleUpdateVehicle,
  getVehicleById,
  getAllVehicles,
};



