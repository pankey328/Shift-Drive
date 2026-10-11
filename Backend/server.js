require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sequelize = require("./src/dbconfig/db");
const authRoutes = require("./src/routes/authRoutes");
const walletRoutes = require("./src/routes/walletRoutes");
const hubRoutes = require("./src/routes/hubRoutes");
const vehicleRoutes = require("./src/routes/vehicleRoutes");
const bookingRoutes = require("./src/routes/bookingRoutes");
const inspectionRoutes = require("./src/routes/inspectionRoutes");
const startBookingCron = require("./src/cron/ghostBookingCron");
const startLateReturnCron = require("./src/cron/lateReturnCron");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/hubs", hubRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/inspections", inspectionRoutes);

// Database connection & Server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");

    await sequelize.sync({ alter: true });
    console.log("Database synchronized successfully");

    startBookingCron();
    console.log("Booking Cron jobs initialized");

    startLateReturnCron();
    console.log("Late Return Cron jobs initialized");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to database:", error);
  }
};

startServer();
