const {
  createInspectionRecord,
  getInspectionsByBooking,
  findInspectionsByManager,
  findAllInspections,
} = require("../repositories/inspectionRepository");
const {
  findBookingById,
  updateBookingStatus,
} = require("../repositories/bookingRepository");
const { processFinancialMovement } = require("../repositories/walletRepository");
const vehicleRepository = require("../repositories/vehicleRepository");
const userRepository = require("../repositories/userRepository");
const { handleMaintenanceEscalation } = require("./escalationService");
const { uploadImage } = require("../utils/cloudinary");

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

const DAMAGE_FINES = {
  MINOR: 1000,
  MAJOR: 5000,
  CRITICAL: 15000,
};

const submitInspection = async (
  bookingId,
  adminId,
  { type, notes, damage_flagged, damage_severity, requires_maintenance },
  files,
) => {
  const booking = await findBookingById(bookingId);
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

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
    await vehicleRepository.updateVehicleStatus(booking.vehicle_id, "IN_USE");
  } else if (type === "POST_TRIP") {
    await updateBookingStatus(bookingId, "COMPLETED");

    // Re-assign vehicle hub to dropoff_hub_id for one-way rentals
    if (booking.dropoff_hub_id) {
      await vehicleRepository.transferVehicleHub(booking.vehicle_id, booking.dropoff_hub_id);
    }

    if (isDamaged && damage_severity) {
      const tier = DAMAGE_TIERS[damage_severity.toUpperCase()];

      if (!tier) throw new Error("Invalid damage severity tier provided.");

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
      const vehicle = await vehicleRepository.findVehicleById(booking.vehicle_id);
      if (vehicle) {
        await vehicleRepository.updateVehicleStatus(vehicle.vehicleId, "MAINTENANCE");

        // Trigger the background escalation to swap user to a new car
        await handleMaintenanceEscalation(vehicle.vehicleId);
      }
    } else {
      await vehicleRepository.updateVehicleStatus(booking.vehicle_id, "ACTIVE");
    }
  }


  return inspection;
};

const getBookingInspections = async (bookingId) => {
  return await getInspectionsByBooking(bookingId);
};

const fetchManagerInspections = async (managerId) => {
  const manager = await userRepository.findUserById(managerId);
  if (!manager) {
    const error = new Error("Manager not found.");
    error.statusCode = 404;
    throw error;
  }

  const inspections = await findInspectionsByManager(managerId);

  let totalFines = 0;
  const formattedData = inspections.map((insp) => {
    const fine =
      insp.damage_flagged && insp.damage_severity
        ? DAMAGE_FINES[insp.damage_severity] || 0
        : 0;
    totalFines += fine;

    return {
      inspectionId: insp.inspectionId,
      type: insp.type,
      photo_urls: insp.photo_urls,
      notes: insp.notes,
      damage_flagged: insp.damage_flagged,
      damage_severity: insp.damage_severity,
      penalty_fined: fine,
      createdAt: insp.createdAt,
      booking: insp.Booking
        ? {
            bookingId: insp.Booking.bookingId,
            user_id: insp.Booking.user_id,
            start_time: insp.Booking.start_time,
            end_time: insp.Booking.end_time,
            status: insp.Booking.status,
            vehicle: insp.Booking.Vehicle,
          }
        : null,
    };
  });

  return {
    manager,
    summary: {
      total_inspections: inspections.length,
      damages_flagged: inspections.filter((i) => i.damage_flagged).length,
      total_penalties_fined: totalFines,
    },
    data: formattedData,
  };
};

const fetchAllInspections = async ({ damageOnly, severity }) => {
  const whereClause = {};
  if (damageOnly === "true") whereClause.damage_flagged = true;
  if (severity) whereClause.damage_severity = severity.toUpperCase();

  const inspections = await findAllInspections(whereClause);

  let totalFines = 0;
  const formattedData = inspections.map((insp) => {
    const fine =
      insp.damage_flagged && insp.damage_severity
        ? DAMAGE_FINES[insp.damage_severity] || 0
        : 0;
    totalFines += fine;

    return {
      inspectionId: insp.inspectionId,
      type: insp.type,
      inspector: insp.Inspector
        ? {
            userId: insp.Inspector.userId,
            name: insp.Inspector.name,
            email: insp.Inspector.email,
            phone: insp.Inspector.phone,
          }
        : null,
      photo_urls: insp.photo_urls,
      notes: insp.notes,
      damage_flagged: insp.damage_flagged,
      damage_severity: insp.damage_severity,
      penalty_fined: fine,
      createdAt: insp.createdAt,
      booking: insp.Booking
        ? {
            bookingId: insp.Booking.bookingId,
            user_id: insp.Booking.user_id,
            start_time: insp.Booking.start_time,
            end_time: insp.Booking.end_time,
            status: insp.Booking.status,
            vehicle: insp.Booking.Vehicle,
          }
        : null,
    };
  });

  return {
    summary: {
      total_inspections: inspections.length,
      damages_flagged: inspections.filter((i) => i.damage_flagged).length,
      total_penalties_fined: totalFines,
    },
    data: formattedData,
  };
};

module.exports = {
  submitInspection,
  getBookingInspections,
  fetchManagerInspections,
  fetchAllInspections,
};

