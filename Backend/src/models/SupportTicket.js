const { DataTypes } = require("sequelize");
const sequelize = require("../dbconfig/db");

const SupportTicket = sequelize.define(
  "SupportTicket",
  {
    ticketId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    booking_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM(
        "BILLING_REFUND",
        "VEHICLE_ISSUE",
        "BOOKING_CHANGE",
        "KYC_VERIFICATION",
        "GENERAL"
      ),
      allowNull: false,
      defaultValue: "GENERAL",
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("OPEN", "AI_RESOLVED", "ESCALATED", "CLOSED"),
      defaultValue: "OPEN",
    },
    priority: {
      type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH", "URGENT"),
      defaultValue: "MEDIUM",
    },
    ai_response: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ai_provider_used: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    admin_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "support_tickets",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = SupportTicket;
