const superadminRepo = require("../repositories/superadminAnalyticsRepository");

const getSuperadminLandingDashboard = async (req, res) => {
  try {
    const [revenue, hubs, managers, fleet] = await Promise.all([
      superadminRepo.getRevenueBreakdown(),
      superadminRepo.getHubPerformances(),
      superadminRepo.getManagerPerformances(),
      superadminRepo.getFleetUtilization(),
    ]);

    const dashboardData = {
      financial_overview: {
        daily: parseFloat(revenue.daily_revenue) || 0,
        weekly: parseFloat(revenue.weekly_revenue) || 0,
        monthly: parseFloat(revenue.monthly_revenue) || 0,
        yearly: parseFloat(revenue.yearly_revenue) || 0,
        all_time: parseFloat(revenue.total_revenue) || 0,
        total_completed_trips: parseInt(revenue.total_completed_trips, 10) || 0,
      },

      fleet_overview: fleet,

      hub_metrics: hubs.map((hub) => ({
        hubId: hub.hubId,
        name: hub.name,
        city: hub.city,
        manager: hub.Manager
          ? {
              userId: hub.Manager.userId,
              name: hub.Manager.name,
              email: hub.Manager.email,
              phone: hub.Manager.phone,
            }
          : null,
        total_cars: parseInt(hub.dataValues.total_cars, 10) || 0,
        operational_cars: parseInt(hub.dataValues.operational_cars, 10) || 0,
        cars_in_maintenance:
          parseInt(hub.dataValues.cars_in_maintenance, 10) || 0,
        cars_in_use: parseInt(hub.dataValues.cars_in_use, 10) || 0,
        hub_revenue: parseFloat(hub.dataValues.total_revenue) || 0,
      })),

      manager_activity: managers.map((mgr) => ({
        manager_id: mgr.userId,
        name: mgr.name,
        email: mgr.email,
        phone: mgr.phone,
        hub_name: mgr.ManagedHub ? mgr.ManagedHub.name : "Unassigned",
        inspections_completed:
          parseInt(mgr.dataValues.total_inspections_done, 10) || 0,
        damages_caught: parseInt(mgr.dataValues.damages_caught, 10) || 0,
      })),
    };

    return res.status(200).json({ success: true, data: dashboardData });
  } catch (error) {
    console.error("Superadmin Dashboard Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSuperadminLandingDashboard };
