const sequelize = require("../dbconfig/db");
const User = require("./User");
const Hub = require("./Hub");
const Vehicle = require("./Vehicle");
const Booking = require("./Booking");
const WalletTransaction = require("./WalletTransaction");
const Inspection = require("./Inspection");

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

// Financial Ledger
User.hasMany(WalletTransaction, { foreignKey: "user_id", as: "WalletLedger" });
WalletTransaction.belongsTo(User, { foreignKey: "user_id" });

Booking.hasMany(WalletTransaction, {
  foreignKey: "booking_id",
  as: "Transactions",
});
WalletTransaction.belongsTo(Booking, { foreignKey: "booking_id" });

module.exports = {
  sequelize,
  User,
  Hub,
  Vehicle,
  Booking,
  WalletTransaction,
  Inspection,
};
