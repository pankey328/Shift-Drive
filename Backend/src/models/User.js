const { DataTypes } = require("sequelize");
const sequelize = require("../dbconfig/database");

const User = sequelize.define(
  "User",
  {
    userId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    role: {
      type: DataTypes.ENUM("CUSTOMER", "HUB_ADMIN", "SUPERADMIN"),
      defaultValue: "CUSTOMER",
      allowNull: false,
    },
    wallet_balance: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.0,
      allowNull: false,
    },
    kyc_status: {
      type: DataTypes.ENUM("PENDING", "VERIFIED", "REJECTED"),
      defaultValue: "PENDING",
    },
    kyc_document_url: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    tableName: "users",

    timestamps: true,

    paranoid: true,
  },
);

module.exports = User;
