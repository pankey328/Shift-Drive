const cron = require("node-cron");
const { Booking, User, Vehicle, Hub } = require("../models");
const { Op } = require("sequelize");
const { processFinancialMovement } = require("../repositories/walletRepository");
const vehicleRepository = require("../repositories/vehicleRepository");
const { sendMail } = require("../utils/sendMail");

const startNoShowCron = () => {
  // Runs every 15 minutes (*/15 * * * *)
  cron.schedule("*/15 * * * *", async () => {
    console.log("[CRON] Sweeping uncollected bookings & no-show reservations...");

    try {
      const now = new Date();

      const confirmedBookings = await Booking.findAll({
        where: {
          status: "CONFIRMED",
        },
        include: [
          {
            model: User,
            as: "Customer",
            attributes: ["userId", "name", "email", "phone", "wallet_balance"],
          },
          {
            model: Vehicle,
            as: "Vehicle",
            attributes: ["vehicleId", "make", "model", "plate_number", "status"],
          },
          {
            model: Hub,
            as: "PickupHub",
            attributes: ["hubId", "name", "city", "opening_time", "closing_time"],
          },
        ],
      });

      for (const booking of confirmedBookings) {
        const bookingId = booking.bookingId || booking.id;
        const startTime = new Date(booking.start_time);
        const endTime = new Date(booking.end_time);

        // Calculate pickup station closing datetime on the scheduled pickup date
        const closingTimeStr = booking.PickupHub?.closing_time || "20:00:00";
        const [closeH, closeM] = closingTimeStr.split(":").map(Number);
        const hubCloseOnPickupDate = new Date(
          startTime.getFullYear(),
          startTime.getMonth(),
          startTime.getDate(),
          closeH || 20,
          closeM || 0,
          0
        );

        // CASE 1: Silent No-Show (Did NOT press Running Late & Hub is closed on pickup date)
        if (!booking.is_delayed_pickup && now.getTime() > hubCloseOnPickupDate.getTime()) {
          console.log(`[CRON] Detected silent no-show for booking ${bookingId} at closed station ${booking.PickupHub?.name || ""}`);

          const totalPrice = parseFloat(booking.total_price || 0);
          const penaltyAmount = 1000.0;
          const refundAmount = Math.max(0, totalPrice - penaltyAmount);

          // 1. Process wallet refund if any amount remains after penalty
          if (refundAmount > 0) {
            await processFinancialMovement({
              userId: booking.user_id,
              amount: refundAmount,
              type: "REFUND",
              description: `No-show auto-cancellation (₹1,000 penalty deducted) for Booking #${bookingId.slice(0, 8)}`,
              bookingId,
            });
          }

          // 2. Mark booking as CANCELLED
          booking.status = "CANCELLED";
          booking.cancellation_reason = `Automated cancellation: Customer no-show before hub closing without notification. ₹${penaltyAmount.toFixed(0)} penalty assessed. Net refund: ₹${refundAmount.toFixed(2)}.`;
          await booking.save();

          // 3. Release vehicle back to available fleet
          if (booking.vehicle_id) {
            await vehicleRepository.updateVehicleStatus(booking.vehicle_id, "ACTIVE");
          }

          // 4. Send cancellation email with full breakdown
          if (booking.Customer?.email) {
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
                <h2 style="color: #dc2626;">ShiftDrive: Reservation Cancelled (No-Show)</h2>
                <p>Hello <strong>${booking.Customer.name || "Customer"}</strong>,</p>
                <p>Your scheduled pickup for vehicle <strong>${booking.Vehicle?.make || ""} ${booking.Vehicle?.model || ""}</strong> (${booking.Vehicle?.plate_number || ""}) was not collected before the station closing time (${closingTimeStr.slice(0, 5)}) at <strong>${booking.PickupHub?.name || "the station"}</strong>.</p>
                <p>Because our dispatch desk did not receive a "Running Late" notice from you prior to station closing, this reservation has been automatically cancelled to free up the vehicle.</p>
                
                <div style="background-color: #f8fafc; border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0;">
                  <p style="margin: 4px 0;"><strong>Original Booking Amount:</strong> ₹${totalPrice.toFixed(2)}</p>
                  <p style="margin: 4px 0; color: #dc2626;"><strong>No-Show Penalty Deducted:</strong> ₹${penaltyAmount.toFixed(2)}</p>
                  <p style="margin: 4px 0; color: #16a34a; font-size: 16px;"><strong>Net Refund Credited to Wallet:</strong> ₹${refundAmount.toFixed(2)}</p>
                </div>
                
                <p>Your vehicle has been returned to active station inventory. If you need a ride for upcoming dates, you may book anytime directly via the ShiftDrive portal.</p>
                <p style="color: #64748b; font-size: 12px; margin-top: 24px;">ShiftDrive Mobility Operations Command</p>
              </div>
            `;
            try {
              await sendMail(booking.Customer.email, `ShiftDrive: Booking Cancelled - No Show Notice (#${bookingId.slice(0, 8)})`, emailHtml);
            } catch (err) {
              console.error("[CRON] Failed to send no-show email:", err.message);
            }
          }
        }

        // CASE 2: Running Late was Clicked, but final reservation end_time has passed without pickup
        else if (booking.is_delayed_pickup && now.getTime() > endTime.getTime()) {
          console.log(`[CRON] Delayed pickup reservation ${bookingId} expired at end_time`);

          // 1. Mark booking as CANCELLED / EXPIRED with 0 refund
          booking.status = "CANCELLED";
          booking.cancellation_reason = "Reservation expired: Vehicle was held for delayed pickup but was not collected before the reservation end time. 0 refund as vehicle was reserved exclusively throughout the rental period.";
          await booking.save();

          // 2. Release vehicle back to available fleet
          if (booking.vehicle_id) {
            await vehicleRepository.updateVehicleStatus(booking.vehicle_id, "ACTIVE");
          }

          // 3. Send expiration email
          if (booking.Customer?.email) {
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
                <h2 style="color: #d97706;">ShiftDrive: Reservation Period Expired</h2>
                <p>Hello <strong>${booking.Customer.name || "Customer"}</strong>,</p>
                <p>Your vehicle <strong>${booking.Vehicle?.make || ""} ${booking.Vehicle?.model || ""}</strong> was held for you at <strong>${booking.PickupHub?.name || "the station"}</strong> following your "Running Late" notice.</p>
                <p>However, the total scheduled reservation duration has now concluded without vehicle pickup.</p>
                
                <div style="background-color: #f8fafc; border-left: 4px solid #d97706; padding: 12px; margin: 16px 0;">
                  <p style="margin: 4px 0;"><strong>Reservation Status:</strong> Expired / Cancelled</p>
                  <p style="margin: 4px 0;"><strong>Vehicle Status:</strong> Released to station fleet</p>
                  <p style="margin: 4px 0; color: #64748b;"><strong>Refund:</strong> ₹0.00 (Vehicle was blocked exclusively on your behalf for the full duration)</p>
                </div>
                
                <p>Thank you for using ShiftDrive. Please contact customer support if you have any questions.</p>
                <p style="color: #64748b; font-size: 12px; margin-top: 24px;">ShiftDrive Mobility Operations Command</p>
              </div>
            `;
            try {
              await sendMail(booking.Customer.email, `ShiftDrive: Reservation Expired (#${bookingId.slice(0, 8)})`, emailHtml);
            } catch (err) {
              console.error("[CRON] Failed to send expired reservation email:", err.message);
            }
          }
        }
      }
    } catch (error) {
      console.error("[CRON] Error during no-show scan:", error);
    }
  });
};

module.exports = startNoShowCron;
