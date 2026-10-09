const { DataTypes } = require("sequelize");
const sequelize = require("../dbconfig/db");

const WalletTransaction = sequelize.define(
  "WalletTransaction",
  {
    transactionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    type: {
      type: DataTypes.ENUM(
        "TOPUP_MANUAL",
        "TOPUP_GATEWAY",
        "BOOKING_CHARGE",
        "REFUND",
        "LATE_FEE",
        "DAMAGE_PENALTY",
      ),
      allowNull: false,
    },
    description: { type: DataTypes.STRING(255), allowNull: false },
  },
  {
    tableName: "transactions",
    timestamps: true,
    paranoid: true,
  },
);

module.exports = WalletTransaction;
