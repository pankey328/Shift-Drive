const {
  Vehicle,
  Booking,
  Inspection,
  User,
  Hub,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");

// REVENUE BREAKDOWN (Daily, Weekly, Monthly, Yearly, Total)
const getRevenueBreakdown = async () => {
  const query = `
    SELECT 
      IFNULL(SUM(CASE WHEN DATE(createdAt) = CURDATE() THEN total_price ELSE 0 END), 0) as daily_revenue,
      IFNULL(SUM(CASE WHEN YEARWEEK(createdAt, 1) = YEARWEEK(CURDATE(), 1) THEN total_price ELSE 0 END), 0) as weekly_revenue,
      IFNULL(SUM(CASE WHEN MONTH(createdAt) = MONTH(CURDATE()) AND YEAR(createdAt) = YEAR(CURDATE()) THEN total_price ELSE 0 END), 0) as monthly_revenue,
      IFNULL(SUM(CASE WHEN YEAR(createdAt) = YEAR(CURDATE()) THEN total_price ELSE 0 END), 0) as yearly_revenue,
      IFNULL(SUM(total_price), 0) as total_revenue,
      COUNT(*) as total_completed_trips
    FROM bookings 
    WHERE status = 'COMPLETED' AND deletedAt IS NULL;
  `;
  const [results] = await sequelize.query(query);
  return results[0] || {
    daily_revenue: 0,
    weekly_revenue: 0,
    monthly_revenue: 0,
    yearly_revenue: 0,
    total_revenue: 0,
    total_completed_trips: 0,
  };
};

// HUB PERFORMANCE (Cars breakdown, Statuses, and Revenue per Hub)
const getHubPerformances = async () => {
  return await Hub.findAll({
    attributes: [
      "hubId",
      "name",
      "city",
      [
        sequelize.literal(
          `(SELECT COUNT(*) FROM vehicles WHERE vehicles.current_hub_id = Hub.hubId AND vehicles.deletedAt IS NULL)`
        ),
        "total_cars",
      ],
      [
        sequelize.literal(
          `(SELECT COUNT(*) FROM vehicles WHERE vehicles.current_hub_id = Hub.hubId AND vehicles.status = 'ACTIVE' AND vehicles.deletedAt IS NULL)`
        ),
        "operational_cars",
      ],
      [
        sequelize.literal(
          `(SELECT COUNT(*) FROM vehicles WHERE vehicles.current_hub_id = Hub.hubId AND vehicles.status = 'MAINTENANCE' AND vehicles.deletedAt IS NULL)`
        ),
        "cars_in_maintenance",
      ],
      [
        sequelize.literal(
          `(SELECT COUNT(*) FROM vehicles WHERE vehicles.current_hub_id = Hub.hubId AND vehicles.status = 'IN_USE' AND vehicles.deletedAt IS NULL)`
        ),
        "cars_in_use",
      ],
      [
        sequelize.literal(
          `(SELECT IFNULL(SUM(total_price), 0) FROM bookings WHERE bookings.pickup_hub_id = Hub.hubId AND bookings.status = 'COMPLETED' AND bookings.deletedAt IS NULL)`
        ),
        "total_revenue",
      ],
    ],
    include: [
      {
        model: User,
        as: "Manager",
        attributes: ["userId", "name", "email", "phone"],
      },
    ],
    order: [["name", "ASC"]],
  });
};

// MANAGER INSPECTION LEADERBOARD (Who inspected how many cars, damages flagged)
const getManagerPerformances = async () => {
  return await User.findAll({
    where: { role: "HUB_ADMIN" },
    attributes: [
      "userId",
      "name",
      "email",
      "phone",
      [
        sequelize.literal(
          `(SELECT COUNT(*) FROM inspections WHERE inspections.admin_id = User.userId AND inspections.deletedAt IS NULL)`
        ),
        "total_inspections_done",
      ],
      [
        sequelize.literal(
          `(SELECT COUNT(*) FROM inspections WHERE inspections.admin_id = User.userId AND inspections.damage_flagged = true AND inspections.deletedAt IS NULL)`
        ),
        "damages_caught",
      ],
    ],
    include: [
      {
        model: Hub,
        as: "ManagedHub",
        attributes: ["hubId", "name", "city"],
      },
    ],
    order: [[sequelize.literal("total_inspections_done"), "DESC"]],
  });
};

// FLEET UTILIZATION AND OPERATIONAL KPI
const getFleetUtilization = async () => {
  const [totalVehicles, activeTrips, readyCars, maintenance] = await Promise.all([
    Vehicle.count({ where: { status: { [Op.ne]: "RETIRED" } } }),
    Booking.count({ where: { status: { [Op.in]: ["ACTIVE_TRIP", "EMERGENCY_HOLD"] } } }),
    Vehicle.count({ where: { status: "ACTIVE" } }),
    Vehicle.count({ where: { status: "MAINTENANCE" } }),
  ]);

  const utilizationRate =
    totalVehicles > 0
      ? parseFloat(((activeTrips / totalVehicles) * 100).toFixed(2))
      : 0;

  return {
    total_vehicles: totalVehicles,
    active_trips: activeTrips,
    ready_on_lot: readyCars,
    maintenance_vehicles: maintenance,
    utilization_rate_pct: utilizationRate,
  };
};

module.exports = {
  getRevenueBreakdown,
  getHubPerformances,
  getManagerPerformances,
  getFleetUtilization,
};
