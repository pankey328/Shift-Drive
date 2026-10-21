const { Op } = require("sequelize");
const { Vehicle, Booking, Hub, User } = require("../models");

const createVehicle = async (vehicleData) => {
  return await Vehicle.create(vehicleData);
};

const getVehiclesByHub = async (hubId) => {
  return await Vehicle.findAll({
    where: { current_hub_id: hubId },
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
    ],
    order: [["createdAt", "DESC"]],
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
  const where = { status: "ACTIVE" };
  if (filters.category && filters.category !== "ALL") {
    where.vehicle_class = filters.category;
  }
  if (filters.hubId) {
    where.current_hub_id = filters.hubId;
  }
  return await Vehicle.findAll({
    where,
    include: [
      {
        model: Hub,
        as: "CurrentHub",
        attributes: ["hubId", "name", "city", "address", "status"],
      },
    ],
    order: [["base_daily_rate", "DESC"]],
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


