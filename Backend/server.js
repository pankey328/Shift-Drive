require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sequelize = require("./src/dbconfig/db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;

// Routes
app.get("/api/health", (req, res) => {
  res.json({ message: "Car Rental API is running" });
});
// TODO: Attach route modules when implemented in src/routes
// app.use("/api/users", userRoutes);
// app.use("/api/orders", orderRoutes);

// Database connection
const startServer = async () => {
  try {
    await sequelize.authenticate();

    console.log("Database connected successfully");

    // Development only
    await sequelize.sync();

    console.log("Database synchronized successfully");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to database:", error);
  }
};

startServer();
