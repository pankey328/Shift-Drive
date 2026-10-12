const { DataTypes } = require("sequelize");
const sequelize = require("../dbconfig/db");

const FleetTransfer = sequelize.define(
  "FleetTransfer",
  {
    transferId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    source_hub_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    destination_hub_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    vehicle_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    initiated_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    driver_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    driver_phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "IN_TRANSIT", "COMPLETED", "CANCELLED"),
      defaultValue: "PENDING",
    },
    reason: {
      type: DataTypes.STRING(255),
      defaultValue: "Inventory rebalancing",
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "fleet_transfers",
    timestamps: true,
  },
);

module.exports = FleetTransfer;
