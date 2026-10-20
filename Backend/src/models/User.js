const { DataTypes } = require("sequelize");
const sequelize = require("../dbconfig/db");

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
    phone: { type: DataTypes.STRING(20), allowNull: true },
    password: { type: DataTypes.STRING(255), allowNull: true },
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
    kyc_rejection_reason: { type: DataTypes.STRING(255), allowNull: true },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    requires_password_change: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    kyc_document_url: { type: DataTypes.STRING(500), allowNull: true },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    otp: { type: DataTypes.STRING(255), allowNull: true },
    otpExpiry: { type: DataTypes.DATE, allowNull: true },
    provider: { type: DataTypes.STRING(20), defaultValue: "local" },
    googleId: { type: DataTypes.STRING(255), allowNull: true },
    photo: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    tableName: "users",
    timestamps: true,
    paranoid: true,
  },
);

module.exports = User;
