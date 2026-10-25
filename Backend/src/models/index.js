const sequelize = require("../dbconfig/db");
const User = require("./User");
const Hub = require("./Hub");
const Vehicle = require("./Vehicle");
const Booking = require("./Booking");
const WalletTransaction = require("./WalletTransaction");
const Inspection = require("./Inspection");
const FleetTransfer = require("./FleetTransfer");
const LostAndFound = require("./LostAndFound");

// Hub Management
User.hasOne(Hub, { foreignKey: "manager_id", as: "ManagedHub" });
Hub.belongsTo(User, { as: "Manager", foreignKey: "manager_id" });

// Fleet Inventory
Hub.hasMany(Vehicle, { foreignKey: "current_hub_id", as: "Vehicles" });
Vehicle.belongsTo(Hub, { foreignKey: "current_hub_id", as: "CurrentHub" });

// Bookings
User.hasMany(Booking, { foreignKey: "user_id", as: "Bookings" });
Booking.belongsTo(User, { foreignKey: "user_id", as: "Customer" });

Vehicle.hasMany(Booking, { foreignKey: "vehicle_id", as: "Bookings" });
Booking.belongsTo(Vehicle, { foreignKey: "vehicle_id", as: "Vehicle" });

Hub.hasMany(Booking, { foreignKey: "pickup_hub_id", as: "PickupBookings" });
Booking.belongsTo(Hub, { foreignKey: "pickup_hub_id", as: "PickupHub" });

Hub.hasMany(Booking, { foreignKey: "dropoff_hub_id", as: "DropoffBookings" });
Booking.belongsTo(Hub, { foreignKey: "dropoff_hub_id", as: "DropoffHub" });

// Inspections
Booking.hasMany(Inspection, { foreignKey: "booking_id", as: "Inspections" });
Inspection.belongsTo(Booking, { foreignKey: "booking_id" });
User.hasMany(Inspection, { foreignKey: "admin_id", as: "AdminInspections" });
Inspection.belongsTo(User, { foreignKey: "admin_id", as: "Inspector" });

// Financial Ledger
User.hasMany(WalletTransaction, { foreignKey: "user_id", as: "WalletLedger" });
WalletTransaction.belongsTo(User, { foreignKey: "user_id" });

Booking.hasMany(WalletTransaction, {
  foreignKey: "booking_id",
  as: "Transactions",
});
WalletTransaction.belongsTo(Booking, { foreignKey: "booking_id" });

// Fleet Rebalancing / Deadheading Transfers
Hub.hasMany(FleetTransfer, {
  foreignKey: "source_hub_id",
  as: "OutboundTransfers",
});
FleetTransfer.belongsTo(Hub, { foreignKey: "source_hub_id", as: "SourceHub" });

Hub.hasMany(FleetTransfer, {
  foreignKey: "destination_hub_id",
  as: "InboundTransfers",
});
FleetTransfer.belongsTo(Hub, {
  foreignKey: "destination_hub_id",
  as: "DestinationHub",
});

Vehicle.hasMany(FleetTransfer, { foreignKey: "vehicle_id", as: "Transfers" });
FleetTransfer.belongsTo(Vehicle, { foreignKey: "vehicle_id", as: "Vehicle" });

User.hasMany(FleetTransfer, {
  foreignKey: "initiated_by",
  as: "InitiatedTransfers",
});
FleetTransfer.belongsTo(User, { foreignKey: "initiated_by", as: "Initiator" });

// Lost & Found
Hub.hasMany(LostAndFound, { foreignKey: "hub_id", as: "LostItems" });
LostAndFound.belongsTo(Hub, { foreignKey: "hub_id", as: "Hub" });

Vehicle.hasMany(LostAndFound, { foreignKey: "vehicle_id", as: "LostItems" });
LostAndFound.belongsTo(Vehicle, { foreignKey: "vehicle_id", as: "Vehicle" });

Booking.hasMany(LostAndFound, { foreignKey: "booking_id", as: "LostItems" });
LostAndFound.belongsTo(Booking, { foreignKey: "booking_id", as: "Booking" });

User.hasMany(LostAndFound, { foreignKey: "logged_by", as: "LoggedLostItems" });
LostAndFound.belongsTo(User, { foreignKey: "logged_by", as: "LoggedBy" });

// Support Tickets & AI Resolutions
const SupportTicket = require("./SupportTicket");
User.hasMany(SupportTicket, { foreignKey: "user_id", as: "SupportTickets" });
SupportTicket.belongsTo(User, { foreignKey: "user_id", as: "Customer" });

Booking.hasMany(SupportTicket, { foreignKey: "booking_id", as: "SupportTickets" });
SupportTicket.belongsTo(Booking, { foreignKey: "booking_id", as: "Booking" });

module.exports = {
  sequelize,
  User,
  Hub,
  Vehicle,
  Booking,
  WalletTransaction,
  Inspection,
  FleetTransfer,
  LostAndFound,
  SupportTicket,
};
