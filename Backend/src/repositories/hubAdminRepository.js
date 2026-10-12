const {
  Booking,
  Vehicle,
  User,
  Hub,
  FleetTransfer,
  LostAndFound,
  WalletTransaction,
} = require("../models");
const { Op } = require("sequelize");

// Resolve Hub for a logged-in Hub Manager
const findHubByManagerId = async (userId) => {
  return await Hub.findOne({ where: { manager_id: userId } });
};

// Daily Schedule: Pickups, Drop-offs, and Overdue returns
const getDailySchedule = async (hubId, startOfDay, endOfDay, now) => {
  const [pickups, dropoffs, overdue] = await Promise.all([
    Booking.findAll({
      where: {
        pickup_hub_id: hubId,
        status: "CONFIRMED",
        start_time: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
      include: [
        {
          model: Vehicle,
          as: "Vehicle",
          attributes: [
            "vehicleId",
            "make",
            "model",
            "plate_number",
            "vehicle_class",
            "status",
          ],
        },
        {
          model: User,
          as: "Customer",
          attributes: ["userId", "name", "phone", "email"],
        },
      ],
      order: [["start_time", "ASC"]],
    }),

    Booking.findAll({
      where: {
        dropoff_hub_id: hubId,
        status: "ACTIVE_TRIP",
        end_time: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
      include: [
        {
          model: Vehicle,
          as: "Vehicle",
          attributes: [
            "vehicleId",
            "make",
            "model",
            "plate_number",
            "vehicle_class",
            "status",
          ],
        },
        {
          model: User,
          as: "Customer",
          attributes: ["userId", "name", "phone", "email"],
        },
      ],
      order: [["end_time", "ASC"]],
    }),

    Booking.findAll({
      where: {
        dropoff_hub_id: hubId,
        status: "ACTIVE_TRIP",
        end_time: { [Op.lt]: now },
      },
      include: [
        {
          model: Vehicle,
          as: "Vehicle",
          attributes: [
            "vehicleId",
            "make",
            "model",
            "plate_number",
            "vehicle_class",
            "status",
          ],
        },
        {
          model: User,
          as: "Customer",
          attributes: ["userId", "name", "phone", "email"],
        },
      ],
      order: [["end_time", "ASC"]],
    }),
  ]);

  return { pickups, dropoffs, overdue };
};

// Local Fleet Health breakdown
const getHubFleetStats = async (hubId) => {
  const vehicles = await Vehicle.findAll({
    where: { current_hub_id: hubId },
    attributes: ["status"],
    raw: true,
  });

  const stats = {
    ACTIVE: 0,
    MAINTENANCE: 0,
    IN_USE: 0,
    RETIRED: 0,
  };

  vehicles.forEach((v) => {
    if (stats[v.status] !== undefined) {
      stats[v.status]++;
    }
  });

  return stats;
};

// FLEET REBALANCING
const createFleetTransferRecord = async (transferData) => {
  return await FleetTransfer.create(transferData);
};

const getFleetTransfersByHub = async (hubId, filters = {}) => {
  const where = {
    [Op.or]: [{ source_hub_id: hubId }, { destination_hub_id: hubId }],
  };

  if (filters.status) {
    where.status = filters.status;
  }

  return await FleetTransfer.findAll({
    where,
    include: [
      {
        model: Hub,
        as: "SourceHub",
        attributes: ["hubId", "name", "city", "address"],
      },
      {
        model: Hub,
        as: "DestinationHub",
        attributes: ["hubId", "name", "city", "address"],
      },
      {
        model: Vehicle,
        as: "Vehicle",
        attributes: [
          "vehicleId",
          "make",
          "model",
          "plate_number",
          "vehicle_class",
          "status",
        ],
      },
      {
        model: User,
        as: "Initiator",
        attributes: ["userId", "name", "email", "phone"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

const findFleetTransferById = async (transferId) => {
  return await FleetTransfer.findByPk(transferId, {
    include: [
      { model: Hub, as: "SourceHub" },
      { model: Hub, as: "DestinationHub" },
      { model: Vehicle, as: "Vehicle" },
      {
        model: User,
        as: "Initiator",
        attributes: ["userId", "name", "email", "phone"],
      },
    ],
  });
};

const updateFleetTransfer = async (transferId, updateData) => {
  const record = await FleetTransfer.findByPk(transferId);
  if (!record) {
    const error = new Error("Fleet transfer request not found");
    error.statusCode = 404;
    throw error;
  }
  return await record.update(updateData);
};

// WALK-IN POS (POINT OF SALE)
const findCustomerByContact = async ({ email, phone }) => {
  const whereConditions = [];
  if (email) whereConditions.push({ email: email.toLowerCase().trim() });
  if (phone) whereConditions.push({ phone });

  if (whereConditions.length === 0) return null;

  return await User.findOne({
    where: { [Op.or]: whereConditions },
  });
};

const createWalkInCustomer = async (userData) => {
  return await User.create(userData);
};

const createPosBookingRecord = async (bookingData) => {
  return await Booking.create(bookingData);
};

const recordPosPayment = async (transactionData) => {
  return await WalletTransaction.create(transactionData);
};

// LOST & FOUND LEDGER
const createLostItemRecord = async (itemData) => {
  return await LostAndFound.create(itemData);
};

const getLostItemsByHub = async (hubId, filters = {}) => {
  const where = { hub_id: hubId };

  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.vehicle_id) where.vehicle_id = filters.vehicle_id;

  return await LostAndFound.findAll({
    where,
    include: [
      {
        model: Vehicle,
        as: "Vehicle",
        attributes: [
          "vehicleId",
          "make",
          "model",
          "plate_number",
          "vehicle_class",
        ],
      },
      {
        model: Booking,
        as: "Booking",
        attributes: [
          "bookingId",
          "user_id",
          "start_time",
          "end_time",
          "status",
        ],
      },
      {
        model: User,
        as: "LoggedBy",
        attributes: ["userId", "name", "email"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
};

const findLostItemById = async (itemId) => {
  return await LostAndFound.findByPk(itemId, {
    include: [
      { model: Hub, as: "Hub" },
      { model: Vehicle, as: "Vehicle" },
      { model: Booking, as: "Booking" },
      {
        model: User,
        as: "LoggedBy",
        attributes: ["userId", "name", "email"],
      },
    ],
  });
};

const findLostItemsForBookingCar = async (bookingId) => {
  const booking = await Booking.findByPk(bookingId, {
    include: [
      {
        model: Vehicle,
        as: "Vehicle",
        attributes: ["vehicleId", "make", "model", "plate_number"],
      },
      {
        model: User,
        as: "Customer",
        attributes: ["userId", "name", "phone", "email"],
      },
    ],
  });

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  const items = await LostAndFound.findAll({
    where: {
      [Op.or]: [{ booking_id: bookingId }, { vehicle_id: booking.vehicle_id }],
    },
    include: [
      { model: Hub, as: "Hub", attributes: ["hubId", "name", "city"] },
      {
        model: Vehicle,
        as: "Vehicle",
        attributes: ["vehicleId", "make", "model", "plate_number"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  return {
    booking: {
      bookingId: booking.bookingId,
      customer: booking.Customer,
      vehicle: booking.Vehicle,
      start_time: booking.start_time,
      end_time: booking.end_time,
      status: booking.status,
    },
    items,
  };
};

const updateLostItemRecord = async (itemId, updateData) => {
  const item = await LostAndFound.findByPk(itemId);
  if (!item) {
    const error = new Error("Lost and found item not found");
    error.statusCode = 404;
    throw error;
  }
  return await item.update(updateData);
};

module.exports = {
  findHubByManagerId,
  getDailySchedule,
  getHubFleetStats,
  createFleetTransferRecord,
  getFleetTransfersByHub,
  findFleetTransferById,
  updateFleetTransfer,
  findCustomerByContact,
  createWalkInCustomer,
  createPosBookingRecord,
  recordPosPayment,
  createLostItemRecord,
  getLostItemsByHub,
  findLostItemById,
  findLostItemsForBookingCar,
  updateLostItemRecord,
};
