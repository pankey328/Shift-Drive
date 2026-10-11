const { Booking, Vehicle } = require("../models");
const { Op } = require("sequelize");
const {
  processFinancialMovement,
} = require("../repositories/walletRepository");
const { differenceInDays } = require("date-fns");

const classHierarchy = { HATCHBACK: 1, SEDAN: 2, SUV: 3, LUXURY: 4 };

const handleLateReturnEscalation = async (lateBooking) => {
  const bId = lateBooking.bookingId || lateBooking.id;
  console.log(` Escalation triggered for Late Booking ID: ${bId}`);

  // Charge User ₹1000/hour they are late
  const endTime = new Date(lateBooking.end_time);
  const hoursLate = Math.ceil(
    (Date.now() - endTime.getTime()) / (1000 * 60 * 60),
  );
  const penaltyAmount = Math.max(hoursLate, 1) * 1000;

  await processFinancialMovement({
    userId: lateBooking.user_id,
    amount: -penaltyAmount,
    type: "LATE_FEE",
    description: `Late return penalty (${hoursLate} hours)`,
    bookingId: bId,
  });

  // FIND IMPACTED USER
  const nextBooking = await Booking.findOne({
    where: {
      vehicle_id: lateBooking.vehicle_id,
      status: "CONFIRMED",
      start_time: { [Op.lt]: new Date(Date.now() + 2 * 60 * 60 * 1000) },
    },
  });

  if (!nextBooking) return; // No one is waiting

  const impactedBookingId = nextBooking.bookingId || nextBooking.id;
  console.log(
    `Attempting Fleet Swap for User (Booking ${impactedBookingId})...`,
  );

  const impactedVehicle = await Vehicle.findByPk(lateBooking.vehicle_id);
  const targetRank = classHierarchy[impactedVehicle.vehicle_class] || 1;

  // Find busy cars to exclude from search
  const busyBookings = await Booking.findAll({
    where: { status: { [Op.in]: ["CONFIRMED", "ACTIVE_TRIP"] } },
  });
  const busyIds = busyBookings.map((b) => b.vehicle_id).filter(Boolean);

  // Get all available cars at the exact same hub
  const availableCars = await Vehicle.findAll({
    where: {
      current_hub_id: impactedVehicle.current_hub_id,
      status: "ACTIVE",
      ...(busyIds.length > 0 && { vehicleId: { [Op.notIn]: busyIds } }),
    },
  });

  let replacementCar = null;
  let swapType = "";

  // Exact Same Make & Model
  replacementCar = availableCars.find(
    (car) =>
      car.make === impactedVehicle.make && car.model === impactedVehicle.model,
  );
  if (replacementCar) swapType = "EXACT_MATCH";

  // Same Class
  if (!replacementCar) {
    replacementCar = availableCars.find(
      (car) => car.vehicle_class === impactedVehicle.vehicle_class,
    );
    if (replacementCar) swapType = "SAME_CLASS";
  }

  // Upgraded Class
  if (!replacementCar) {
    replacementCar = availableCars.find(
      (car) => (classHierarchy[car.vehicle_class] || 1) > targetRank,
    );
    if (replacementCar) swapType = "UPGRADE";
  }

  if (replacementCar) {
    const repCarId = replacementCar.vehicleId || replacementCar.id;
    console.log(`Swap Successful (${swapType}). Assigned Vehicle ${repCarId}`);

    const oldRate = parseFloat(impactedVehicle.base_daily_rate);
    const newRate = parseFloat(replacementCar.base_daily_rate);

    if (newRate < oldRate) {
      const rentalDays =
        differenceInDays(new Date(nextBooking.end_time), new Date(nextBooking.start_time)) || 1;
      const refundAmount = (oldRate - newRate) * rentalDays;

      await processFinancialMovement({
        userId: nextBooking.user_id,
        amount: refundAmount,
        type: "REFUND",
        description: `Partial refund: Swapped to a cheaper vehicle (${replacementCar.make} ${replacementCar.model})`,
        bookingId: impactedBookingId,
      });

      nextBooking.total_price =
        parseFloat(nextBooking.total_price) - refundAmount;
    }

    nextBooking.vehicle_id = repCarId;
    await nextBooking.save();
  } else {
    // Cancel & Full Refund + ₹1000 Apology Credit
    console.log(`No replacement found. Cancelling User B's booking...`);
    nextBooking.status = "CANCELLED";
    await nextBooking.save();

    const refundTotal = parseFloat(nextBooking.total_price) + 1000;

    await processFinancialMovement({
      userId: nextBooking.user_id,
      amount: refundTotal,
      type: "REFUND",
      description:
        "Booking cancelled due to late return by previous user + ₹1000 Apology Credit",
      bookingId: impactedBookingId,
    });
  }
};

const handleMaintenanceEscalation = async (brokenVehicleId) => {
  console.log(
    `Vehicle ${brokenVehicleId} went into MAINTENANCE. Rescuing future bookings...`,
  );

  // Find ALL future CONFIRMED bookings for specific broken car
  const impactedBookings = await Booking.findAll({
    where: {
      vehicle_id: brokenVehicleId,
      status: "CONFIRMED",
      start_time: { [Op.gt]: new Date() },
    },
    order: [["start_time", "ASC"]],
  });

  if (impactedBookings.length === 0) {
    console.log("No future bookings impacted by this maintenance.");
    return;
  }

  const brokenVehicle = await Vehicle.findByPk(brokenVehicleId);
  if (!brokenVehicle) {
    console.log(`Vehicle ${brokenVehicleId} not found.`);
    return;
  }

  const targetRank = classHierarchy[brokenVehicle.vehicle_class] || 1;

  for (const nextBooking of impactedBookings) {
    const bookingPk = nextBooking.bookingId || nextBooking.id;
    console.log(`Attempting Fleet Swap for Booking ${bookingPk}...`);

    const bookingStartTime = new Date(nextBooking.start_time);
    const bookingEndTime = new Date(nextBooking.end_time);

    const busyBookings = await Booking.findAll({
      where: {
        bookingId: { [Op.ne]: bookingPk },
        status: { [Op.in]: ["CONFIRMED", "ACTIVE_TRIP"] },
        start_time: {
          [Op.lt]: new Date(bookingEndTime.getTime() + 2 * 60 * 60 * 1000),
        },
        end_time: {
          [Op.gt]: new Date(bookingStartTime.getTime() - 2 * 60 * 60 * 1000),
        },
      },
    });
    const busyIds = busyBookings.map((b) => b.vehicle_id).filter(Boolean);

    const availableCars = await Vehicle.findAll({
      where: {
        current_hub_id: brokenVehicle.current_hub_id,
        status: "ACTIVE",
        ...(busyIds.length > 0 && { vehicleId: { [Op.notIn]: busyIds } }),
      },
    });

    let replacementCar = null;
    let swapType = "";

    // Exact Same Make & Model
    replacementCar = availableCars.find(
      (car) =>
        car.make === brokenVehicle.make && car.model === brokenVehicle.model,
    );
    if (replacementCar) swapType = "EXACT_MATCH";

    // Same Class
    if (!replacementCar) {
      replacementCar = availableCars.find(
        (car) => car.vehicle_class === brokenVehicle.vehicle_class,
      );
      if (replacementCar) swapType = "SAME_CLASS";
    }

    // Upgrade
    if (!replacementCar) {
      replacementCar = availableCars.find(
        (car) => (classHierarchy[car.vehicle_class] || 1) > targetRank,
      );
      if (replacementCar) swapType = "UPGRADE";
    }

    if (replacementCar) {
      const repCarId = replacementCar.vehicleId || replacementCar.id;
      console.log(
        `Swap Successful (${swapType}). Assigned Vehicle ${repCarId}`,
      );

      const oldRate = parseFloat(brokenVehicle.base_daily_rate);
      const newRate = parseFloat(replacementCar.base_daily_rate);

      // Refund if the replacement is cheaper
      if (newRate < oldRate) {
        const rentalDays =
          differenceInDays(bookingEndTime, bookingStartTime) || 1;
        const refundAmount = (oldRate - newRate) * rentalDays;

        await processFinancialMovement({
          userId: nextBooking.user_id,
          amount: refundAmount,
          type: "REFUND",
          description: `Partial refund: Swapped to a cheaper vehicle due to fleet maintenance.`,
          bookingId: bookingPk,
        });
        nextBooking.total_price =
          parseFloat(nextBooking.total_price) - refundAmount;
      }

      nextBooking.vehicle_id = repCarId;
      await nextBooking.save();
    } else {
      // Cancel & Refund
      console.log(
        `No replacement found. Cancelling Booking ${bookingPk}...`,
      );
      nextBooking.status = "CANCELLED";
      await nextBooking.save();

      // Full refund + Apology credit
      const refundTotal = parseFloat(nextBooking.total_price) + 1000;
      await processFinancialMovement({
        userId: nextBooking.user_id,
        amount: refundTotal,
        type: "REFUND",
        description:
          "Booking cancelled due to unexpected vehicle maintenance + ₹1000 Apology Credit",
        bookingId: bookingPk,
      });
    }
  }
};

module.exports = { handleLateReturnEscalation, handleMaintenanceEscalation };
