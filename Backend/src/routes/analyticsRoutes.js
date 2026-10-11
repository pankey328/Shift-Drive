const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getSuperadminLandingDashboard,
} = require("../controllers/analyticsController");

router.use(protect);
router.use(authorize("SUPERADMIN"));

// GET /api/analytics/superadmin 
router.get("/superadmin", getSuperadminLandingDashboard);

module.exports = router;
