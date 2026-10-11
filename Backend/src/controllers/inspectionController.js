const inspectionService = require("../services/inspectionService");

const addInspection = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { bookingId } = req.params;

    const { type, notes, damage_flagged, damage_severity, requires_maintenance } = req.body;

    const files = req.files;

    if (!type || !["PRE_TRIP", "POST_TRIP"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inspection type. Must be PRE_TRIP or POST_TRIP.",
      });
    }

    if (
      (damage_flagged === "true" || damage_flagged === true) &&
      !damage_severity
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Damage severity (MINOR, MAJOR, CRITICAL) is required when damage is flagged.",
      });
    }

    const inspection = await inspectionService.submitInspection(
      bookingId,
      adminId,
      { type, notes, damage_flagged, damage_severity, requires_maintenance },
      files,
    );

    return res.status(201).json({ success: true, data: inspection });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ success: false, message: error.message });
  }
};

const fetchInspections = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const inspections = await inspectionService.getBookingInspections(bookingId);
    return res.status(200).json({ success: true, data: inspections });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ success: false, message: error.message });
  }
};

module.exports = { addInspection, fetchInspections };
