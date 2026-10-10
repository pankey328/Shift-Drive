const hubService = require("../services/hubService");

const createHub = async (req, res) => {
  try {
    const { name, city, address, opening_time, closing_time } = req.body;

    if (!(name && city && address && opening_time && closing_time)) {
      return res.status(400).json({ message: "All hub fields are required" });
    }

    const hub = await hubService.createNewHub({
      name,
      city,
      address,
      opening_time,
      closing_time,
    });
    return res.status(201).json({ success: true, data: hub });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getHubs = async (req, res) => {
  try {
    const hubs = await hubService.getActiveHubs();
    return res.status(200).json({ success: true, data: hubs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createHub, getHubs };
