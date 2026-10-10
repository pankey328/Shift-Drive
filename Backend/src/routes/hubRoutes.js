const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { createHub, getHubs } = require("../controllers/hubController");

// Public route: Anyone can view hubs on the map
router.get("/", getHubs);

// Protected route: Only Superadmins can create new Hub locations
router.post("/", protect, authorize("SUPERADMIN"), createHub);

module.exports = router;
