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
  const [pickups, dropoffs, overdue, emergencies] = await Promise.all([
    Booking.findAll({
      where: {
        pickup_hub_id: hubId,
        status: "CONFIRMED",
        [Op.or]: [
          {
            start_time: {
              [Op.between]: [startOfDay, endOfDay],
            },
          },
          {
            is_delayed_pickup: true,
            end_time: {
              [Op.gt]: now,
            },
          },
        ],
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
          "gallery_urls",
          ],
        },
        {
          model: User,
          as: "Customer",
          attributes: [
            "userId",
            "name",
            "phone",
            "email",
            "kyc_status",
            "kyc_document_url",
            "kyc_rejection_reason",
          ],
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
          "gallery_urls",
          ],
        },
        {
          model: User,
          as: "Customer",
          attributes: [
            "userId",
            "name",
            "phone",
            "email",
            "kyc_status",
            "kyc_document_url",
            "kyc_rejection_reason",
          ],
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
          "gallery_urls",
          ],
        },
        {
          model: User,
          as: "Customer",
          attributes: [
            "userId",
            "name",
            "phone",
            "email",
            "kyc_status",
            "kyc_document_url",
            "kyc_rejection_reason",
          ],
        },
      ],
      order: [["end_time", "ASC"]],
    }),

    Booking.findAll({
      where: {
        [Op.or]: [{ pickup_hub_id: hubId }, { dropoff_hub_id: hubId }],
        status: "EMERGENCY_HOLD",
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
          "gallery_urls",
          ],
        },
        {
          model: User,
          as: "Customer",
          attributes: [
            "userId",
            "name",
            "phone",
            "email",
            "kyc_status",
            "kyc_document_url",
          ],
        },
      ],
      order: [["updatedAt", "DESC"]],
    }),
  ]);

  return { pickups, dropoffs, overdue, emergencies };
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

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    where[Op.and] = [
      ...(where[Op.and] || []),
      {
        [Op.or]: [
          { transferId: { [Op.like]: searchPattern } },
          { driver_name: { [Op.like]: searchPattern } },
          { driver_phone: { [Op.like]: searchPattern } },
          { reason: { [Op.like]: searchPattern } },
          { "$Vehicle.plate_number$": { [Op.like]: searchPattern } },
          { "$Vehicle.make$": { [Op.like]: searchPattern } },
          { "$Vehicle.model$": { [Op.like]: searchPattern } },
          { "$SourceHub.name$": { [Op.like]: searchPattern } },
          { "$DestinationHub.name$": { [Op.like]: searchPattern } },
        ],
      },
    ];
  }

  const includeConfig = [
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
      "gallery_urls",
      ],
    },
    {
      model: User,
      as: "Initiator",
      attributes: ["userId", "name", "email", "phone"],
    },
  ];

  if (filters.page || filters.limit) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { count, rows } = await FleetTransfer.findAndCountAll({
      where,
      include: includeConfig,
      distinct: true,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return {
      transfers: rows,
      totalItems: count,
      totalPages: Math.ceil(count / limit) || 1,
      currentPage: page,
      limit,
    };
  }

  return await FleetTransfer.findAll({
    where,
    include: includeConfig,
    order: [["createdAt", "DESC"]],
  });
};

const getAllPlatformFleetTransfers = async (filters = {}) => {
  const where = {};
  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }
  if (filters.sourceHubId && filters.sourceHubId !== "ALL") {
    where.source_hub_id = filters.sourceHubId;
  }
  if (filters.destinationHubId && filters.destinationHubId !== "ALL") {
    where.destination_hub_id = filters.destinationHubId;
  }

  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    where[Op.or] = [
      { transferId: { [Op.like]: searchPattern } },
      { driver_name: { [Op.like]: searchPattern } },
      { driver_phone: { [Op.like]: searchPattern } },
      { reason: { [Op.like]: searchPattern } },
      { "$Vehicle.plate_number$": { [Op.like]: searchPattern } },
      { "$Vehicle.make$": { [Op.like]: searchPattern } },
      { "$Vehicle.model$": { [Op.like]: searchPattern } },
      { "$SourceHub.name$": { [Op.like]: searchPattern } },
      { "$DestinationHub.name$": { [Op.like]: searchPattern } },
    ];
  }

  const includeConfig = [
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
        "gallery_urls",
      ],
    },
    {
      model: User,
      as: "Initiator",
      attributes: ["userId", "name", "email", "phone"],
    },
  ];

  if (filters.page || filters.limit) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { count, rows } = await FleetTransfer.findAndCountAll({
      where,
      include: includeConfig,
      distinct: true,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return {
      transfers: rows,
      totalItems: count,
      totalPages: Math.ceil(count / limit) || 1,
      currentPage: page,
      limit,
    };
  }

  return await FleetTransfer.findAll({
    where,
    include: includeConfig,
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

const findCustomerByQuery = async (query) => {
  const isEmail = query.includes("@");
  const conditions = [];

  if (isEmail) {
    conditions.push({ email: query.toLowerCase().trim() });
  } else {
    conditions.push({ phone: query.trim() });
    conditions.push({ phone: { [Op.like]: `%${query.trim()}%` } });
    conditions.push({ email: { [Op.like]: `%${query.trim()}%` } });
    conditions.push({ name: { [Op.like]: `%${query.trim()}%` } });
  }

  return await User.findOne({
    where: {
      role: "CUSTOMER",
      [Op.or]: conditions,
    },
    attributes: [
      "userId",
      "name",
      "email",
      "phone",
      "kyc_status",
      "kyc_document_url",
    ],
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

  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.category && filters.category !== "ALL") where.category = filters.category;
  if (filters.vehicle_id) where.vehicle_id = filters.vehicle_id;

  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    where[Op.and] = [
      ...(where[Op.and] || []),
      {
        [Op.or]: [
          { item_name: { [Op.like]: searchPattern } },
          { description: { [Op.like]: searchPattern } },
          { storage_location: { [Op.like]: searchPattern } },
          { claimed_by_name: { [Op.like]: searchPattern } },
          { "$Vehicle.plate_number$": { [Op.like]: searchPattern } },
          { "$Vehicle.make$": { [Op.like]: searchPattern } },
          { "$Vehicle.model$": { [Op.like]: searchPattern } },
        ],
      },
    ];
  }

  const includeConfig = [
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
  ];

  if (filters.page || filters.limit) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { count, rows } = await LostAndFound.findAndCountAll({
      where,
      include: includeConfig,
      distinct: true,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return {
      items: rows,
      totalItems: count,
      totalPages: Math.ceil(count / limit) || 1,
      currentPage: page,
      limit,
    };
  }

  return await LostAndFound.findAll({
    where,
    include: includeConfig,
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

// Daily Shift Counter Cash & Register Settlement
const getShiftSettlement = async (hubId, startOfDay, endOfDay) => {
  // Fetch POS bookings created today at this station
  const posBookings = await Booking.findAll({
    where: {
      pickup_hub_id: hubId,
      createdAt: { [Op.between]: [startOfDay, endOfDay] },
      incident_notes: { [Op.like]: "%Walk-In POS%" },
    },
    include: [
      {
        model: User,
        as: "Customer",
        attributes: ["userId", "name", "phone", "email"],
      },
      {
        model: Vehicle,
        as: "Vehicle",
        attributes: ["vehicleId", "make", "model", "plate_number"],
      },
      {
        model: WalletTransaction,
        as: "Transactions",
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  // Fetch late return / damage penalties collected at this station today
  const counterPenalties = await WalletTransaction.findAll({
    where: {
      createdAt: { [Op.between]: [startOfDay, endOfDay] },
      type: { [Op.in]: ["LATE_FEE", "DAMAGE_PENALTY"] },
    },
    include: [
      {
        model: Booking,
        where: { dropoff_hub_id: hubId },
        include: [
          {
            model: User,
            as: "Customer",
            attributes: ["userId", "name", "phone"],
          },
          {
            model: Vehicle,
            as: "Vehicle",
            attributes: ["vehicleId", "make", "model", "plate_number"],
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  let cashTotal = 0;
  let upiTotal = 0;
  let cardTotal = 0;
  let otherTotal = 0;
  let grandTotal = 0;

  const items = [];

  // Process POS bookings
  for (const b of posBookings) {
    const amount = parseFloat(b.total_price) || 0;
    grandTotal += amount;
    const notes = b.incident_notes || "";
    let mode = "CARD";
    if (/CASH/i.test(notes)) {
      mode = "CASH";
      cashTotal += amount;
    } else if (/UPI/i.test(notes)) {
      mode = "UPI";
      upiTotal += amount;
    } else {
      mode = "CARD";
      cardTotal += amount;
    }

    items.push({
      type: "POS_RENTAL",
      reference_id: b.bookingId,
      customer_name: b.Customer?.name || "Walk-In Guest",
      customer_phone: b.Customer?.phone || "",
      vehicle: `${b.Vehicle?.make || ""} ${b.Vehicle?.model || ""} (${b.Vehicle?.plate_number || ""})`.trim(),
      payment_method: mode,
      amount,
      timestamp: b.createdAt,
      description: `Walk-In Rental: ${b.Vehicle?.make || ""} ${b.Vehicle?.model || ""}`,
    });
  }

  // Process post-trip counter penalties
  for (const p of counterPenalties) {
    const amount = Math.abs(parseFloat(p.amount)) || 0;
    grandTotal += amount;
    const desc = p.description || "";
    let mode = "CARD";
    if (/CASH/i.test(desc)) {
      mode = "CASH";
      cashTotal += amount;
    } else if (/UPI/i.test(desc)) {
      mode = "UPI";
      upiTotal += amount;
    } else {
      mode = "CARD";
      cardTotal += amount;
    }

    items.push({
      type: p.type,
      reference_id: p.transactionId,
      customer_name: p.Booking?.Customer?.name || "Counter Customer",
      customer_phone: p.Booking?.Customer?.phone || "",
      vehicle: `${p.Booking?.Vehicle?.make || ""} ${p.Booking?.Vehicle?.model || ""} (${p.Booking?.Vehicle?.plate_number || ""})`.trim(),
      payment_method: mode,
      amount,
      timestamp: p.createdAt,
      description: p.description,
    });
  }

  return {
    cash_in_register: cashTotal,
    upi_qr_collected: upiTotal,
    card_pos_terminal: cardTotal,
    other_collected: otherTotal,
    grand_total_settlement: grandTotal,
    pos_bookings_count: posBookings.length,
    penalties_count: counterPenalties.length,
    total_transactions_count: items.length,
    items,
  };
};

// Resolve Emergency for Hub
const resolveHubEmergency = async (bookingId, hubId, { resolution, managerNotes }) => {
  const booking = await Booking.findOne({
    where: {
      bookingId,
      [Op.or]: [{ pickup_hub_id: hubId }, { dropoff_hub_id: hubId }],
      status: "EMERGENCY_HOLD",
    },
    include: [{ model: Vehicle, as: "Vehicle" }],
  });

  if (!booking) {
    const error = new Error("Active emergency booking not found for this station.");
    error.statusCode = 404;
    throw error;
  }

  const timestamp = new Date().toISOString();
  const resolutionNote = `\n[Emergency Resolved on ${timestamp}]: Action: ${resolution}. Notes: ${managerNotes || "Resolved by Hub Manager at station."}`;

  if (resolution === "RESUME_TRIP") {
    booking.status = "ACTIVE_TRIP";
    booking.incident_notes = (booking.incident_notes || "") + resolutionNote;
    await booking.save();
    if (booking.Vehicle) {
      await booking.Vehicle.update({ status: "IN_USE" });
    }
  } else if (resolution === "TOW_TO_MAINTENANCE" || resolution === "COMPLETED") {
    booking.status = "COMPLETED";
    booking.incident_notes = (booking.incident_notes || "") + resolutionNote;
    await booking.save();
    if (booking.Vehicle) {
      await booking.Vehicle.update({
        status: "MAINTENANCE",
        current_hub_id: hubId,
      });
    }
  } else if (resolution === "CANCELLED") {
    booking.status = "CANCELLED";
    booking.incident_notes = (booking.incident_notes || "") + resolutionNote;
    await booking.save();
    if (booking.Vehicle) {
      await booking.Vehicle.update({
        status: "MAINTENANCE",
        current_hub_id: hubId,
      });
    }
  } else {
    const error = new Error("Invalid resolution type.");
    error.statusCode = 400;
    throw error;
  }

  return booking;
};

module.exports = {
  findHubByManagerId,
  getDailySchedule,
  getHubFleetStats,
  createFleetTransferRecord,
  getFleetTransfersByHub,
  getAllPlatformFleetTransfers,
  findFleetTransferById,
  updateFleetTransfer,
  findCustomerByContact,
  findCustomerByQuery,
  createWalkInCustomer,
  createPosBookingRecord,
  recordPosPayment,
  createLostItemRecord,
  getLostItemsByHub,
  findLostItemById,
  findLostItemsForBookingCar,
  updateLostItemRecord,
  getShiftSettlement,
  resolveHubEmergency,
};

