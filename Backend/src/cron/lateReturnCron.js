const cron = require("node-cron");
const { Booking } = require("../models");
const { Op } = require("sequelize");
const { handleLateReturnEscalation } = require("../services/escalationService");

const startLateReturnCron = () => {
  // Runs every 30 minutes (*/30 * * * *)
  cron.schedule("*/30 * * * *", async () => {
    console.log("[CRON] Scanning for late vehicle returns...");

    try {
      const lateBookings = await Booking.findAll({
        where: {
          status: "ACTIVE_TRIP",
          end_time: { [Op.lt]: new Date() }, 
        },
      });

      for (const booking of lateBookings) {
        await handleLateReturnEscalation(booking);
      }
    } catch (error) {
      console.error("[CRON] Error during late return sweep:", error);
    }
  });
};

module.exports = startLateReturnCron;
