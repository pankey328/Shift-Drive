const hubAdminRepository = require("../repositories/hubAdminRepository");
const vehicleRepository = require("../repositories/vehicleRepository");
const { uploadImage } = require("../utils/cloudinary");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { differenceInDays } = require("date-fns");

// Helper to resolve manager's assigned Hub
const resolveManagerHub = async (user, requestedHubId = null) => {
  if (user.role === "SUPERADMIN" && requestedHubId) {
    return requestedHubId;
  }

  if (user.hub_id) {
    return user.hub_id;
  }

  const managedHub = await hubAdminRepository.findHubByManagerId(user.userId);
  if (!managedHub) {
    const error = new Error(
      "Unauthorized: No active Hub assigned to this manager.",
    );
    error.statusCode = 403;
    throw error;
  }

  return managedHub.hubId;
};

// HUB MANAGER DASHBOARD (TODAY'S ACTION DESK)
const generateHubDashboard = async (hubId) => {
  if (!hubId) {
    const error = new Error("Hub ID is required.");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));
  const currentTime = new Date();

  const [schedule, fleetStats] = await Promise.all([
    hubAdminRepository.getDailySchedule(
      hubId,
      startOfDay,
      endOfDay,
      currentTime,
    ),
    hubAdminRepository.getHubFleetStats(hubId),
  ]);

  return {
    hub_id: hubId,
    action_desk: {
      pending_pickups: schedule.pickups,
      pending_dropoffs: schedule.dropoffs,
      action_required_overdue: schedule.overdue,
    },
    local_fleet_health: {
      ready_to_rent: fleetStats["ACTIVE"] || 0,
      in_maintenance: fleetStats["MAINTENANCE"] || 0,
      in_use: fleetStats["IN_USE"] || 0,
      total_on_lot:
        (fleetStats["ACTIVE"] || 0) + (fleetStats["MAINTENANCE"] || 0),
    },
  };
};

// FLEET REBALANCING (DEADHEADING TRANSFERS)
const requestFleetTransfer = async ({
  source_hub_id,
  destination_hub_id,
  vehicle_id,
  initiated_by,
  driver_name,
  driver_phone,
  reason,
  immediate_transit = false,
}) => {
  if (!(source_hub_id && destination_hub_id && vehicle_id)) {
    const error = new Error(
      "Source hub, destination hub, and vehicle ID are required.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (source_hub_id === destination_hub_id) {
    const error = new Error("Source and destination hub cannot be the same.");
    error.statusCode = 400;
    throw error;
  }

  // Validate vehicle
  const vehicle = await vehicleRepository.findVehicleById(vehicle_id);
  if (!vehicle) {
    const error = new Error("Vehicle not found.");
    error.statusCode = 404;
    throw error;
  }

  if (vehicle.current_hub_id !== source_hub_id) {
    const error = new Error(
      "Vehicle is not currently stationed at the specified source hub.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (vehicle.status === "IN_USE") {
    const error = new Error(
      "Vehicle is currently in use by a customer and cannot be transferred.",
    );
    error.statusCode = 400;
    throw error;
  }

  const status = immediate_transit ? "IN_TRANSIT" : "PENDING";

  const transfer = await hubAdminRepository.createFleetTransferRecord({
    source_hub_id,
    destination_hub_id,
    vehicle_id,
    initiated_by,
    driver_name,
    driver_phone,
    reason: reason || "Inventory rebalancing",
    status,
  });

  if (immediate_transit) {
    await vehicleRepository.updateVehicleStatus(vehicle_id, "IN_USE");
  }

  return transfer;
};

const startFleetTransfer = async (
  transferId,
  { driver_name, driver_phone },
) => {
  const transfer = await hubAdminRepository.findFleetTransferById(transferId);
  if (!transfer) {
    const error = new Error("Fleet transfer request not found.");
    error.statusCode = 404;
    throw error;
  }

  if (transfer.status !== "PENDING") {
    const error = new Error(
      `Cannot start transfer with status ${transfer.status}.`,
    );
    error.statusCode = 400;
    throw error;
  }

  await vehicleRepository.updateVehicleStatus(transfer.vehicle_id, "IN_USE");

  return await hubAdminRepository.updateFleetTransfer(transferId, {
    status: "IN_TRANSIT",
    ...(driver_name && { driver_name }),
    ...(driver_phone && { driver_phone }),
  });
};

const completeFleetTransfer = async (transferId) => {
  const transfer = await hubAdminRepository.findFleetTransferById(transferId);
  if (!transfer) {
    const error = new Error("Fleet transfer request not found.");
    error.statusCode = 404;
    throw error;
  }

  if (transfer.status === "COMPLETED") {
    const error = new Error("Transfer is already completed.");
    error.statusCode = 400;
    throw error;
  }

  await vehicleRepository.transferVehicleHub(
    transfer.vehicle_id,
    transfer.destination_hub_id,
  );
  await vehicleRepository.updateVehicleStatus(transfer.vehicle_id, "ACTIVE");

  return await hubAdminRepository.updateFleetTransfer(transferId, {
    status: "COMPLETED",
    completed_at: new Date(),
  });
};

const cancelFleetTransfer = async (transferId) => {
  const transfer = await hubAdminRepository.findFleetTransferById(transferId);
  if (!transfer) {
    const error = new Error("Fleet transfer request not found.");
    error.statusCode = 404;
    throw error;
  }

  if (transfer.status === "COMPLETED") {
    const error = new Error("Cannot cancel an already completed transfer.");
    error.statusCode = 400;
    throw error;
  }

  await vehicleRepository.updateVehicleStatus(transfer.vehicle_id, "ACTIVE");

  return await hubAdminRepository.updateFleetTransfer(transferId, {
    status: "CANCELLED",
  });
};

const listHubTransfers = async (hubId, filters) => {
  return await hubAdminRepository.getFleetTransfersByHub(hubId, filters);
};

// WALK-IN POS (POINT OF SALE)
const processWalkInRental = async ({
  hubId,
  customerData,
  bookingData,
  paymentData,
}) => {
  const { name, email, phone, driving_license_number } = customerData;

  if (!name || !phone) {
    const error = new Error(
      "Customer name and phone number are required for walk-in booking.",
    );
    error.statusCode = 400;
    throw error;
  }

  let customer = await hubAdminRepository.findCustomerByContact({
    email,
    phone,
  });

  if (!customer) {
    const tempPassword = crypto.randomBytes(4).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const generatedEmail = email || `walkin_${Date.now()}@shiftdrive.local`;

    customer = await hubAdminRepository.createWalkInCustomer({
      name,
      email: generatedEmail,
      phone,
      password: hashedPassword,
      role: "CUSTOMER",
      isVerified: true,
      kyc_status: "VERIFIED",
      kyc_document_url: driving_license_number
        ? `DL# ${driving_license_number}`
        : null,
      requires_password_change: true,
    });
  }

  const { vehicleId, start_time, end_time, total_price, dropoff_hub_id } =
    bookingData;
  const vehicle = await vehicleRepository.findVehicleById(vehicleId);

  if (!vehicle) {
    const error = new Error("Requested vehicle not found.");
    error.statusCode = 404;
    throw error;
  }

  if (vehicle.current_hub_id !== hubId) {
    const error = new Error("Vehicle is not stationed at this hub.");
    error.statusCode = 400;
    throw error;
  }

  if (vehicle.status !== "ACTIVE") {
    const error = new Error(
      `Vehicle is not available for rental (Status: ${vehicle.status}).`,
    );
    error.statusCode = 400;
    throw error;
  }

  const start = start_time ? new Date(start_time) : new Date();
  const end = new Date(end_time);

  if (end <= start) {
    const error = new Error("Rental end time must be after start time.");
    error.statusCode = 400;
    throw error;
  }

  let finalPrice = total_price;
  if (!finalPrice) {
    const days = differenceInDays(end, start) || 1;
    finalPrice = days * parseFloat(vehicle.base_daily_rate);
  }

  const booking = await hubAdminRepository.createPosBookingRecord({
    user_id: customer.userId,
    vehicle_id: vehicle.vehicleId,
    pickup_hub_id: hubId,
    dropoff_hub_id: dropoff_hub_id || hubId,
    start_time: start,
    end_time: end,
    total_price: finalPrice,
    status: "ACTIVE_TRIP",
    incident_notes: `Walk-In POS booking. Payment Method: ${paymentData.payment_method || "CASH/CARD_SWIPE"}`,
  });

  await vehicleRepository.updateVehicleStatus(vehicle.vehicleId, "IN_USE");

  await hubAdminRepository.recordPosPayment({
    user_id: customer.userId,
    amount: -Math.abs(finalPrice),
    type: "BOOKING_CHARGE",
    description: `Walk-In POS payment: ${paymentData.payment_method || "CARD_SWIPE"} (Ref: ${paymentData.reference || "Front Desk"})`,
    booking_id: booking.bookingId,
  });

  return {
    booking,
    customer: {
      userId: customer.userId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    },
    vehicle: {
      vehicleId: vehicle.vehicleId,
      make: vehicle.make,
      model: vehicle.model,
      plate_number: vehicle.plate_number,
    },
    payment: {
      amount: finalPrice,
      method: paymentData.payment_method || "CARD_SWIPE",
      reference: paymentData.reference || "POS-VERIFIED",
    },
  };
};

// LOST & FOUND LEDGER
const logLostItem = async (hubId, managerId, itemData, files) => {
  const {
    item_name,
    category,
    description,
    vehicle_id,
    booking_id,
    storage_location,
    found_date,
  } = itemData;

  if (!item_name) {
    const error = new Error("Item name is required.");
    error.statusCode = 400;
    throw error;
  }

  let photo_url = null;
  if (files && files.length > 0) {
    const urls = await uploadImage(files);
    photo_url = urls[0];
  }

  return await hubAdminRepository.createLostItemRecord({
    hub_id: hubId,
    vehicle_id: vehicle_id || null,
    booking_id: booking_id || null,
    item_name,
    category: category || "OTHER",
    description,
    photo_url,
    storage_location: storage_location || "Front Desk / Storage",
    found_date: found_date || new Date(),
    status: "STORED",
    logged_by: managerId,
  });
};

const fetchLostItems = async (hubId, filters) => {
  return await hubAdminRepository.getLostItemsByHub(hubId, filters);
};

const searchLostItemsByBooking = async (bookingId) => {
  if (!bookingId) {
    const error = new Error("Booking ID is required.");
    error.statusCode = 400;
    throw error;
  }
  return await hubAdminRepository.findLostItemsForBookingCar(bookingId);
};

const claimLostItem = async (itemId, { claimed_by_name, claimed_by_phone }) => {
  if (!claimed_by_name || !claimed_by_phone) {
    const error = new Error("Claimant name and phone number are required.");
    error.statusCode = 400;
    throw error;
  }

  const item = await hubAdminRepository.findLostItemById(itemId);
  if (!item) {
    const error = new Error("Lost and found item not found.");
    error.statusCode = 404;
    throw error;
  }

  if (item.status === "CLAIMED") {
    const error = new Error("Item has already been claimed.");
    error.statusCode = 400;
    throw error;
  }

  return await hubAdminRepository.updateLostItemRecord(itemId, {
    status: "CLAIMED",
    claimed_by_name,
    claimed_by_phone,
    claimed_at: new Date(),
  });
};

module.exports = {
  resolveManagerHub,
  generateHubDashboard,
  requestFleetTransfer,
  startFleetTransfer,
  completeFleetTransfer,
  cancelFleetTransfer,
  listHubTransfers,
  processWalkInRental,
  logLostItem,
  fetchLostItems,
  searchLostItemsByBooking,
  claimLostItem,
};
