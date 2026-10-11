const { DataTypes } = require("sequelize");
const sequelize = require("../dbconfig/db");

const Inspection = sequelize.define(
  "Inspection",
  {
    inspectionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    admin_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    type: { type: DataTypes.ENUM("PRE_TRIP", "POST_TRIP"), allowNull: false },
    photo_urls: { type: DataTypes.JSON, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    damage_flagged: { type: DataTypes.BOOLEAN, defaultValue: false },
    damage_severity: {
      type: DataTypes.ENUM("MINOR", "MAJOR", "CRITICAL"),
      allowNull: true,
    },
  },
  {
    tableName: "inspections",
    timestamps: true,
    paranoid: true,
  },
);

module.exports = Inspection;
