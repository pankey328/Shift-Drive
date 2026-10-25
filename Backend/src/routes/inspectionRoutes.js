const express = require("express");
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  addInspection,
  fetchInspections,
  getManagerInspections,
  getAllInspections,
  handleGetInspectionComparison,
} = require("../controllers/inspectionController");

router.use(protect);

// Superadmin views all inspections with damage flags & fines
router.get("/admin/all", authorize("SUPERADMIN"), getAllInspections);

// Superadmin or Manager gets side-by-side pre-trip vs post-trip audit for a booking
router.get(
  "/audit/comparison/:bookingId",
  authorize("SUPERADMIN", "HUB_ADMIN"),
  handleGetInspectionComparison,
);

// Superadmin audits which inspections and photos a specific manager conducted
router.get(
  "/manager/:managerId",
  authorize("SUPERADMIN"),
  getManagerInspections,
);

// Admin submits inspection with up to 10 photos
router.post(
  "/:bookingId",
  authorize("HUB_ADMIN", "SUPERADMIN"),
  upload.array("photos", 10),
  addInspection,
);

// Customer or Admin views the inspection history for a specific booking
router.get("/:bookingId", fetchInspections);

module.exports = router;
