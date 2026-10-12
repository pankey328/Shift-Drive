const { DataTypes } = require("sequelize");
const sequelize = require("../dbconfig/db");

const LostAndFound = sequelize.define(
  "LostAndFound",
  {
    itemId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    hub_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    vehicle_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    booking_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    item_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM(
        "ELECTRONICS",
        "WALLET_CARDS",
        "CLOTHING",
        "DOCUMENTS",
        "KEYS",
        "OTHER",
      ),
      defaultValue: "OTHER",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    found_date: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
    },
    storage_location: {
      type: DataTypes.STRING(100),
      defaultValue: "Front Desk / Storage",
    },
    status: {
      type: DataTypes.ENUM("STORED", "CLAIMED", "DISPOSED"),
      defaultValue: "STORED",
    },
    claimed_by_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    claimed_by_phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    claimed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    logged_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    tableName: "lost_and_found",
    timestamps: true,
  },
);

module.exports = LostAndFound;
