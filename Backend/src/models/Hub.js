const { DataTypes } = require("sequelize");
const sequelize = require("../dbconfig/db");

const Hub = sequelize.define(
  "Hub",
  {
    hubId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(150), allowNull: false },
    city: { type: DataTypes.STRING(100), allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },
    latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
    longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
    opening_time: { type: DataTypes.TIME, allowNull: false },
    closing_time: { type: DataTypes.TIME, allowNull: false },
  },
  {
    tableName: "hubs",
    timestamps: true,
    paranoid: true,
  },
);

module.exports = Hub;
