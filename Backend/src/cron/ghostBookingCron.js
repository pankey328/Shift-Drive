const cron = require("node-cron");
const {
  getGhostBookings,
  updateBookingStatus,
} = require("../repositories/bookingRepository");

// Runs every 5 minutes (* /5 * * * *)
const startBookingCron = () => {
  cron.schedule("*/5 * * * *", async () => {
    console.log(" [CRON] Sweeping expired ghost bookings...");

    try {
      // Find the exact time 5 minutes ago
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const ghostBookings = await getGhostBookings(fiveMinutesAgo);

      for (const booking of ghostBookings) {
        const id = booking.bookingId || booking.id;
        await booking.destroy({ force: true });
        console.log(`[CRON] Temporary hold booking ${id} purged from database (Payment timeout)`);
      }
    } catch (error) {
      console.error("[CRON] Error running ghost sweep:", error.message);
    }
  });
};

module.exports = startBookingCron;
