const hubService = require("../services/hubService");

const createHub = async (req, res) => {
  try {
    const { name, city, address, opening_time, closing_time, manager_id } =
      req.body;

    if (!(name && city && address && opening_time && closing_time)) {
      return res.status(400).json({ message: "All hub fields are required" });
    }

    const hub = await hubService.createNewHub({
      name,
      city,
      address,
      opening_time,
      closing_time,
      manager_id,
    });
    return res.status(201).json({ success: true, data: hub });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const getHubs = async (req, res) => {
  try {
    const hubs = await hubService.getActiveHubs();
    return res.status(200).json({ success: true, data: hubs });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const assignHubManager = async (req, res) => {
  try {
    const { hubId } = req.params;
    const { managerId } = req.body;

    const hub = await hubService.assignManager(hubId, managerId || null);

    return res.status(200).json({
      success: true,
      message: managerId
        ? "Manager assigned to hub successfully."
        : "Manager unassigned from hub.",
      data: hub,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const updateHub = async (req, res) => {
  try {
    const { hubId } = req.params;
    const updatedHub = await hubService.updateHubDetails(hubId, req.body);

    return res.status(200).json({
      success: true,
      message: "Hub details updated successfully.",
      data: updatedHub,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const deleteHub = async (req, res) => {
  try {
    const { hubId } = req.params;
    await hubService.removeHub(hubId);

    return res.status(200).json({
      success: true,
      message: "Hub deleted/deactivated successfully.",
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

module.exports = {
  createHub,
  getHubs,
  assignHubManager,
  updateHub,
  deleteHub,
};

