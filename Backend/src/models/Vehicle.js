const { DataTypes } = require("sequelize");
const sequelize = require("../dbconfig/db");

const Vehicle = sequelize.define(
  "Vehicle",
  {
    vehicleId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    make: { type: DataTypes.STRING(50), allowNull: false },
    model: { type: DataTypes.STRING(50), allowNull: false },
    vehicle_class: {
      type: DataTypes.ENUM("HATCHBACK", "SEDAN", "SUV", "LUXURY"),
      allowNull: false,
    },
    plate_number: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    base_daily_rate: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: {
      type: DataTypes.ENUM("ACTIVE", "IN_USE", "MAINTENANCE", "RETIRED"),
      defaultValue: "ACTIVE",
    },
    gallery_urls: { type: DataTypes.JSON, defaultValue: [] },
    seats: { type: DataTypes.INTEGER, defaultValue: 5 },
    fuel_type: { type: DataTypes.STRING(30), defaultValue: "Petrol" },
    transmission: { type: DataTypes.STRING(30), defaultValue: "Automatic" },
    tag: { type: DataTypes.STRING(50), allowNull: true },
    service_category: { type: DataTypes.STRING(100), allowNull: true },
    service_notes: { type: DataTypes.TEXT, allowNull: true },
    estimated_ready_date: { type: DataTypes.DATE, allowNull: true },
    mechanic_assigned: { type: DataTypes.STRING(100), allowNull: true },
  },

  {
    tableName: "vehicles",
    timestamps: true,
    paranoid: true,
  },
);

module.exports = Vehicle;
