const { Op } = require("sequelize");
const { Vehicle, Booking, Hub, User, sequelize } = require("../models");

const createVehicle = async (vehicleData) => {
  return await Vehicle.create(vehicleData);
};

const getVehiclesByHub = async (hubId, filters = {}) => {
  const where = { current_hub_id: hubId };

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters.category && filters.category !== "ALL") {
    if (filters.category.toUpperCase() === "EV") {
      where[Op.or] = [
        { fuel_type: { [Op.like]: "%Electric%" } },
        { fuel_type: { [Op.like]: "%EV%" } },
      ];
    } else {
      where.vehicle_class = filters.category.toUpperCase();
    }
  }

  if (filters.search && filters.search.trim()) {
    const searchPattern = `%${filters.search.trim()}%`;
    where[Op.and] = [
      ...(where[Op.and] || []),
      {
        [Op.or]: [
          { make: { [Op.like]: searchPattern } },
          { model: { [Op.like]: searchPattern } },
          { plate_number: { [Op.like]: searchPattern } },
          { vehicle_class: { [Op.like]: searchPattern } },
        ],
      },
    ];
  }

  const includeConfig = [
    {
      model: Booking,
      as: "Bookings",
      where: {
        status: { [Op.in]: ["ACTIVE_TRIP", "EMERGENCY_HOLD"] },
      },
      required: false,
      include: [
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
        {
          model: Hub,
          as: "PickupHub",
          attributes: ["hubId", "name", "city"],
        },
        {
          model: Hub,
          as: "DropoffHub",
          attributes: ["hubId", "name", "city"],
        },
      ],
    },
  ];

  // Sorting
  const allowedSortFields = ["createdAt", "base_daily_rate", "make", "model", "status"];
  const sortBy = allowedSortFields.includes(filters.sortBy) ? filters.sortBy : "createdAt";
  const sortOrder = (filters.sortOrder && filters.sortOrder.toUpperCase() === "ASC") ? "ASC" : "DESC";
  const order = [[sortBy, sortOrder]];

  // If pagination requested
  if (filters.page || filters.limit) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 6));
    const offset = (page - 1) * limit;

    const [
      countResult,
      countsResult,
      categoryCountsResult,
      evCountResult,
      revenueResult,
      hubRecord,
      { count, rows },
    ] = await Promise.all([
      Vehicle.count({ where: { current_hub_id: hubId } }),
      Vehicle.findAll({
        where: { current_hub_id: hubId },
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("vehicleId")), "count"],
        ],
        group: ["status"],
        raw: true,
      }),
      Vehicle.findAll({
        where: { current_hub_id: hubId },
        attributes: [
          "vehicle_class",
          [sequelize.fn("COUNT", sequelize.col("vehicleId")), "count"],
        ],
        group: ["vehicle_class"],
        raw: true,
      }),
      Vehicle.count({
        where: {
          current_hub_id: hubId,
          [Op.or]: [
            { fuel_type: { [Op.like]: "%Electric%" } },
            { fuel_type: { [Op.like]: "%EV%" } },
          ],
        },
      }),
      Vehicle.sum("base_daily_rate", {
        where: { current_hub_id: hubId },
      }),
      Hub.findByPk(hubId, {
        attributes: ["hubId", "name", "city", "capacity"],
      }),
      Vehicle.findAndCountAll({
        where,
        include: includeConfig,
        distinct: true,
        order,
        limit,
        offset,
      }),
    ]);

    const statusCounts = {
      all: countResult,
      active: 0,
      in_use: 0,
      maintenance: 0,
      retired: 0,
    };

    countsResult.forEach((item) => {
      const st = (item.status || "").toLowerCase();
      if (statusCounts[st] !== undefined) {
        statusCounts[st] = parseInt(item.count, 10) || 0;
      }
    });

    const categoryCounts = {
      all: countResult,
      suv: 0,
      sedan: 0,
      hatchback: 0,
      luxury: 0,
      ev: evCountResult || 0,
    };

    categoryCountsResult.forEach((item) => {
      const vc = (item.vehicle_class || "").toLowerCase();
      if (categoryCounts[vc] !== undefined) {
        categoryCounts[vc] = parseInt(item.count, 10) || 0;
      }
    });

    const capacity = hubRecord?.capacity || 20;
    // Occupied Bays = vehicles physically taking lot / maintenance bays
    const occupiedBays = (statusCounts.active || 0) + (statusCounts.maintenance || 0);
    const occupancyPercentage = capacity > 0 ? Math.min(100, Math.round((occupiedBays / capacity) * 100)) : 0;
    const dailyRevenuePotential = parseFloat(revenueResult) || 0;

    const lotMetrics = {
      capacity,
      occupiedBays,
      freeBays: Math.max(0, capacity - occupiedBays),
      occupancyPercentage,
      dailyRevenuePotential,
    };

    return {
      vehicles: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit) || 1,
        currentPage: page,
        limit,
      },
      counts: statusCounts,
      categoryCounts,
      lotMetrics,
    };
  }

  return await Vehicle.findAll({
    where,
    include: includeConfig,
    order,
  });
};

const findVehicleById = async (vehicleId) => {
  return await Vehicle.findByPk(vehicleId, {
    include: [
      {
        model: Hub,
        as: "CurrentHub",
        attributes: ["hubId", "name", "city", "address", "status"],
      },
    ],
  });
};

const updateVehicleStatus = async (vehicleId, status, serviceData = {}) => {
  const vehicle = await Vehicle.findByPk(vehicleId);
  if (!vehicle) {
    const error = new Error("Vehicle not found");
    error.statusCode = 404;
    throw error;
  }
  vehicle.status = status;
  if (serviceData.service_category !== undefined) {
    vehicle.service_category = serviceData.service_category;
  }
  if (serviceData.service_notes !== undefined) {
    vehicle.service_notes = serviceData.service_notes;
  }
  if (serviceData.estimated_ready_date !== undefined) {
    vehicle.estimated_ready_date = serviceData.estimated_ready_date;
  }
  if (serviceData.mechanic_assigned !== undefined) {
    vehicle.mechanic_assigned = serviceData.mechanic_assigned;
  }
  if (status === "ACTIVE") {
    vehicle.service_category = null;
  }
  await vehicle.save();
  return vehicle;
};

const transferVehicleHub = async (vehicleId, newHubId) => {
  const vehicle = await Vehicle.findByPk(vehicleId);
  if (!vehicle) {
    const error = new Error("Vehicle not found");
    error.statusCode = 404;
    throw error;
  }
  vehicle.current_hub_id = newHubId;
  await vehicle.save();
  return vehicle;
};

const updateVehicleRecord = async (vehicleId, updateData) => {
  const vehicle = await Vehicle.findByPk(vehicleId);
  if (!vehicle) {
    const error = new Error("Vehicle not found");
    error.statusCode = 404;
    throw error;
  }
  return await vehicle.update(updateData);
};

const findAlternativeVehicle = async ({ hubId, make, model, busyVehicleIds = [] }) => {
  return await Vehicle.findOne({
    where: {
      current_hub_id: hubId,
      make,
      model,
      status: "ACTIVE",
      ...(busyVehicleIds.length > 0 && {
        vehicleId: { [Op.notIn]: busyVehicleIds },
      }),
    },
  });
};


const updateVehicleGallery = async (vehicleId, imageUrls) => {
  const vehicle = await Vehicle.findByPk(vehicleId);

  if (!vehicle) {
    const error = new Error("Vehicle not found");
    error.statusCode = 404;
    throw error;
  }

  const existingUrls = Array.isArray(vehicle.gallery_urls) ? vehicle.gallery_urls : [];
  vehicle.gallery_urls = [...existingUrls, ...imageUrls];
  await vehicle.save();

  return vehicle;
};

const getAvailableVehicles = async (hubId, startTime, endTime) => {
  const busyBookings = await Booking.findAll({
    attributes: ["vehicle_id"],
    where: {
      status: { [Op.in]: ["PENDING_PAYMENT", "CONFIRMED", "ACTIVE_TRIP"] },
      start_time: { [Op.lt]: new Date(endTime) },
      end_time: { [Op.gt]: new Date(startTime) },
    },
    raw: true,
  });

  const busyVehicleIds = busyBookings.map((b) => b.vehicle_id);

  return await Vehicle.findAll({
    where: {
      current_hub_id: hubId,
      status: "ACTIVE",
      ...(busyVehicleIds.length > 0 && { vehicleId: { [Op.notIn]: busyVehicleIds } }),
    },
  });
};

const getHubFleetDetailsWithSummary = async (hubId) => {
  const hub = await Hub.findByPk(hubId, {
    include: [
      {
        model: User,
        as: "Manager",
        attributes: ["userId", "name", "email", "phone"],
      },
    ],
  });
  if (!hub) {
    const error = new Error("Hub not found.");
    error.statusCode = 404;
    throw error;
  }

  const [vehicles, totalRevenue] = await Promise.all([
    Vehicle.findAll({
      where: { current_hub_id: hubId },
      attributes: [
        "vehicleId",
        "make",
        "model",
        "vehicle_class",
        "plate_number",
        "base_daily_rate",
        "status",
        "gallery_urls",
        "createdAt",
      ],
      include: [
        {
          model: Booking,
          as: "Bookings",
          where: {
            status: { [Op.in]: ["ACTIVE_TRIP", "EMERGENCY_HOLD"] },
          },
          required: false,
          include: [
            {
              model: User,
              as: "Customer",
              attributes: ["userId", "name", "phone", "email", "kyc_status", "kyc_document_url"],
            },
            {
              model: Hub,
              as: "PickupHub",
              attributes: ["hubId", "name", "city"],
            },
            {
              model: Hub,
              as: "DropoffHub",
              attributes: ["hubId", "name", "city"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    }),
    Booking.sum("total_price", {
      where: { pickup_hub_id: hubId, status: "COMPLETED" },
    }),
  ]);

  const summary = {
    total_cars: vehicles.length,
    operational_cars: vehicles.filter((v) => v.status === "ACTIVE").length,
    in_use_cars: vehicles.filter((v) => v.status === "IN_USE").length,
    maintenance_cars: vehicles.filter((v) => v.status === "MAINTENANCE").length,
    retired_cars: vehicles.filter((v) => v.status === "RETIRED").length,
    hub_revenue: parseFloat(totalRevenue) || 0,
  };

  return {
    hub: {
      hubId: hub.hubId,
      name: hub.name,
      city: hub.city,
      address: hub.address,
      status: hub.status,
      manager: hub.Manager
        ? {
            userId: hub.Manager.userId,
            name: hub.Manager.name,
            email: hub.Manager.email,
            phone: hub.Manager.phone,
          }
        : null,
    },
    summary,
    data: vehicles,
  };
};

const getAllActiveVehicles = async (filters = {}) => {
  const where = {};

  if (filters.status && filters.status.toUpperCase() === "ALL") {
    // Return all statuses for superadmin master catalog
  } else if (filters.status) {
    where.status = filters.status;
  } else {
    where.status = "ACTIVE";
  }

  if (filters.category && filters.category !== "ALL") {
    where.vehicle_class = filters.category;
  }
  if (filters.hubId && filters.hubId !== "ALL") {
    where.current_hub_id = filters.hubId;
  }
  if (filters.fuel_type && filters.fuel_type !== "ALL") {
    where.fuel_type = filters.fuel_type;
  }
  if (filters.transmission && filters.transmission !== "ALL") {
    where.transmission = filters.transmission;
  }

  if (filters.search) {
    const searchPattern = `%${filters.search}%`;
    where[Op.or] = [
      { plate_number: { [Op.like]: searchPattern } },
      { make: { [Op.like]: searchPattern } },
      { model: { [Op.like]: searchPattern } },
      { vehicle_class: { [Op.like]: searchPattern } },
      { "$CurrentHub.name$": { [Op.like]: searchPattern } },
      { "$CurrentHub.city$": { [Op.like]: searchPattern } },
    ];
  }

  const validSortCols = ["createdAt", "base_daily_rate", "make", "model", "seats", "status"];
  const sortBy = validSortCols.includes(filters.sortBy) ? filters.sortBy : "createdAt";
  const order = filters.order && filters.order.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const includeConfig = [
    {
      model: Hub,
      as: "CurrentHub",
      attributes: ["hubId", "name", "city", "address", "status"],
    },
    {
      model: Booking,
      as: "Bookings",
      where: {
        status: { [Op.in]: ["ACTIVE_TRIP", "EMERGENCY_HOLD"] },
      },
      required: false,
      include: [
        {
          model: User,
          as: "Customer",
          attributes: ["userId", "name", "phone", "email"],
        },
      ],
    },
  ];

  // If pagination is requested (or limit is provided)
  if (filters.page || filters.limit) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const [{ count, rows }, statusCounts] = await Promise.all([
      Vehicle.findAndCountAll({
        where,
        include: includeConfig,
        distinct: true,
        order: [[sortBy, order]],
        limit,
        offset,
      }),
      Vehicle.findAll({
        attributes: ["status", [sequelize.fn("COUNT", sequelize.col("vehicleId")), "count"]],
        group: ["status"],
        raw: true,
      }),
    ]);

    const summary = {
      total: 0,
      ready: 0,
      in_use: 0,
      maintenance: 0,
      retired: 0,
    };

    statusCounts.forEach((sc) => {
      const c = parseInt(sc.count, 10) || 0;
      summary.total += c;
      if (sc.status === "ACTIVE") summary.ready = c;
      else if (sc.status === "IN_USE") summary.in_use = c;
      else if (sc.status === "MAINTENANCE") summary.maintenance = c;
      else if (sc.status === "RETIRED") summary.retired = c;
    });

    return {
      rows,
      count,
      totalPages: Math.ceil(count / limit) || 1,
      currentPage: page,
      limit,
      summary,
    };
  }

  return await Vehicle.findAll({
    where,
    include: includeConfig,
    order: [[sortBy, order]],
  });
};

module.exports = {
  createVehicle,
  getVehiclesByHub,
  findVehicleById,
  updateVehicleStatus,
  transferVehicleHub,
  updateVehicleRecord,
  findAlternativeVehicle,
  updateVehicleGallery,
  getAvailableVehicles,
  getHubFleetDetailsWithSummary,
  getAllActiveVehicles,
};


