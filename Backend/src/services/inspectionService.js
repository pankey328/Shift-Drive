const { createInspectionRecord, getInspectionsByBooking } = require("../repositories/inspectionRepository");
const { updateBookingStatus } = require("../repositories/bookingRepository");
const { processFinancialMovement } = require("../repositories/walletRepository");
const { handleMaintenanceEscalation } = require('./escalationService'); 
const { uploadImage } = require("../utils/cloudinary");
const { Booking, Vehicle } = require("../models");

const DAMAGE_TIERS = {
  MINOR: { amount: 1000, description: "Minor scratches or scuffs" },
  MAJOR: {
    amount: 5000,
    description: "Dents, deep paint damage, or cracked mirrors",
  },
  CRITICAL: {
    amount: 15000,
    description: "Collision damage, broken glass, or structural issues",
  },
};

const submitInspection = async (
  bookingId,
  adminId,
  { type, notes, damage_flagged, damage_severity, requires_maintenance },
  files,
) => {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) throw new Error("Booking not found");

  let photoUrls = [];
  if (files && files.length > 0) {
    photoUrls = await uploadImage(files);
  }

  const isDamaged = damage_flagged === "true" || damage_flagged === true;
  const needsMaintenance =
    requires_maintenance === "true" || requires_maintenance === true;

  // Save the Inspection Report
  const inspection = await createInspectionRecord({
    booking_id: bookingId,
    admin_id: adminId,
    type,
    photo_urls: photoUrls,
    notes,
    damage_flagged: isDamaged,
    damage_severity: isDamaged ? damage_severity : null, 
  });

  if (type === "PRE_TRIP") {
    await updateBookingStatus(bookingId, "ACTIVE_TRIP");
  } else if (type === "POST_TRIP") {
    await updateBookingStatus(bookingId, "COMPLETED");

    if (isDamaged && damage_severity) {
      const tier = DAMAGE_TIERS[damage_severity.toUpperCase()];

      if (!tier) throw new Error("Invalid damage severity tier provided.");

      console.log(`${damage_severity} damage flagged on Booking ${bookingId}.`);

      // Charge the specific tiered penalty
      await processFinancialMovement({
        userId: booking.user_id,
        amount: -tier.amount,
        type: "DAMAGE_PENALTY",
        description: `Damage Penalty (${damage_severity}): ${tier.description}`,
        bookingId: booking.bookingId || booking.id,
      });
    }

    // Only take the car offline if the Admin explicitly marked it
    if (needsMaintenance) {
      const vehicle = await Vehicle.findByPk(booking.vehicle_id);
      if (vehicle) {
        vehicle.status = "MAINTENANCE";
        await vehicle.save();
        const vId = vehicle.vehicleId || vehicle.id;
        console.log(`Vehicle ${vId} placed into MAINTENANCE mode.`);

        // Trigger the background escalation to swap User's to a new car
        await handleMaintenanceEscalation(vId);
      }
    }
  }

  return inspection;
};

const getBookingInspections = async (bookingId) => {
  return await getInspectionsByBooking(bookingId);
};

module.exports = { submitInspection, getBookingInspections };
