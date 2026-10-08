const { DataTypes } = require("sequelize");
const sequelize = require("../dbconfig/database");

const Inspection = sequelize.define(
  "Inspection",
  {
    inspectionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: { type: DataTypes.ENUM("PRE_TRIP", "POST_TRIP"), allowNull: false },
    photo_urls: { type: DataTypes.JSON, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    damage_flagged: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "inspections",
    timestamps: true,
    paranoid: true,
  },
);

module.exports = Inspection;
