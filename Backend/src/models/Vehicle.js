const { DataTypes } = require("sequelize");
const sequelize = require("../dbconfig/database");

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
  },
  {
    tableName: "vehicles",
    timestamps: true,
    paranoid: true,
  },
);

module.exports = Vehicle;
