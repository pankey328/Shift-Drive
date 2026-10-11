const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  addVehicle,
  getVehicles,
  uploadGallery,
  searchVehicles,
  getHubFleetDetails,
  handleUpdateStatus,
  handleTransferHub,
  handleUpdateVehicle,
} = require("../controllers/vehicleController");

router.get("/hub/:hubId/search", searchVehicles);
router.get("/hub/:hubId", getVehicles);

router.use(protect);

router.get("/admin/hub/:hubId", authorize("HUB_ADMIN", "SUPERADMIN"), getHubFleetDetails);
router.post("/", authorize("HUB_ADMIN", "SUPERADMIN"), addVehicle);
router.post("/:id/images", authorize("HUB_ADMIN", "SUPERADMIN"), upload.array("images", 5), uploadGallery);
router.patch("/:id/status", authorize("HUB_ADMIN", "SUPERADMIN"), handleUpdateStatus);
router.patch("/:id/transfer", authorize("SUPERADMIN"), handleTransferHub);
router.put("/:id", authorize("SUPERADMIN"), handleUpdateVehicle);

module.exports = router;

