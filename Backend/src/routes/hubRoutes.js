const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  createHub,
  getHubs,
  assignHubManager,
  updateHub,
  deleteHub,
} = require("../controllers/hubController");

// Public route: Anyone can view hubs on the map
router.get("/", getHubs);

// Protected routes: Only Superadmins can manage Hubs
router.post("/", protect, authorize("SUPERADMIN"), createHub);
router.patch("/:hubId/manager", protect, authorize("SUPERADMIN"), assignHubManager);
router.put("/:hubId", protect, authorize("SUPERADMIN"), updateHub);
router.delete("/:hubId", protect, authorize("SUPERADMIN"), deleteHub);

module.exports = router;

