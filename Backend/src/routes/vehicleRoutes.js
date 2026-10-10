const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  addVehicle,
  getVehicles,
  uploadGallery,
} = require("../controllers/vehicleController");

router.get("/hub/:hubId", getVehicles);

router.use(protect);
router.use(authorize("HUB_ADMIN", "SUPERADMIN"));

router.post("/", addVehicle);
router.post("/:id/images", upload.array("images", 5), uploadGallery);

module.exports = router;
