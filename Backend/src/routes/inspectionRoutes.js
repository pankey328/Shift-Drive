const express = require("express");
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { addInspection, fetchInspections } = require("../controllers/inspectionController");

router.use(protect);

// Admin submits inspection with up to 10 photos
router.post(
  "/:bookingId",
  authorize("HUB_ADMIN", "SUPERADMIN"),
  upload.array("photos", 10),
  addInspection,
);

// Customer (or Admin) views the inspection history
router.get("/:bookingId", fetchInspections);

module.exports = router;
