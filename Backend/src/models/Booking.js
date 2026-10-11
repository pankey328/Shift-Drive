const { DataTypes } = require("sequelize");
const sequelize = require("../dbconfig/db");

const Booking = sequelize.define(
  "Booking",
  {
    bookingId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    start_time: { type: DataTypes.DATE, allowNull: false },
    end_time: { type: DataTypes.DATE, allowNull: false },
    total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    relocation_fee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.0 },
    status: {
      type: DataTypes.ENUM(
        "PENDING_PAYMENT",
        "CONFIRMED",
        "ACTIVE_TRIP",
        "COMPLETED",
        "CANCELLED",
        "EXPIRED",
        "EMERGENCY_HOLD",
      ),
      defaultValue: "PENDING_PAYMENT",
    },
    locked_until: { type: DataTypes.DATE, allowNull: true },
    incident_notes: { type: DataTypes.TEXT, allowNull: true },
    cancellation_reason: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "bookings",
    timestamps: true,
    paranoid: true,
  },
);

module.exports = Booking;
