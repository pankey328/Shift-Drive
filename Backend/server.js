require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sequelize = require("./src/dbconfig/db");

// Route Handlers
const authRoutes = require("./src/routes/authRoutes");
const walletRoutes = require("./src/routes/walletRoutes");
const hubRoutes = require("./src/routes/hubRoutes");
const vehicleRoutes = require("./src/routes/vehicleRoutes");
const bookingRoutes = require("./src/routes/bookingRoutes");
const inspectionRoutes = require("./src/routes/inspectionRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const adminUserRoutes = require("./src/routes/adminUserRoutes");
const hubAdminRoutes = require("./src/routes/hubAdminRoutes");
const supportRoutes = require("./src/routes/supportRoutes");

// Background Cron Jobs
const startBookingCron = require("./src/cron/ghostBookingCron");
const startLateReturnCron = require("./src/cron/lateReturnCron");
const startNoShowCron = require("./src/cron/noShowCron");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/hubs", hubRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/inspections", inspectionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/hub-admin", hubAdminRoutes);
app.use("/api/manager", hubAdminRoutes);
app.use("/api/support", supportRoutes);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File exceeds 2MB limit. Supported formats: JPG, JPEG, PNG, WEBP (Max 2MB per photo).",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Upload limit exceeded. Maximum 5 photos allowed per upload batch.",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err) {
    const status = err.status || err.statusCode || 400;
    return res.status(status).json({
      success: false,
      message: err.message || "Failed to upload vehicle photos. Only JPG, JPEG, PNG, and WEBP formats are supported.",
    });
  }

  next();
});

// Database connection & Server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");

    await sequelize.sync();
    console.log("Database synchronized successfully");

    // Start background automation cron jobs
    startBookingCron();
    console.log("Booking Cron jobs initialized");

    startLateReturnCron();
    console.log("Late Return Cron jobs initialized");

    startNoShowCron();
    console.log("No-Show Cron jobs initialized");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to database:", error);
  }
};

startServer();

