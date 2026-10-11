const hubRepository = require("../repositories/hubRepository");
const userRepository = require("../repositories/userRepository");
const { getCoordinatesFromAddress } = require("../utils/mapbox");

const createNewHub = async ({
  name,
  city,
  address,
  opening_time,
  closing_time,
  manager_id,
}) => {
  // Convert street address to Lat/Lng via Mapbox
  const { latitude, longitude } = await getCoordinatesFromAddress(
    `${address}, ${city}`,
  );

  const newHub = await hubRepository.createHub({
    name,
    city,
    address,
    latitude,
    longitude,
    opening_time,
    closing_time,
    ...(manager_id && { manager_id }),
  });

  return newHub;
};

const getActiveHubs = async () => {
  return await hubRepository.getAllHubs();
};

const updateHubDetails = async (hubId, updateData) => {
  const existingHub = await hubRepository.findHubById(hubId);
  if (!existingHub) {
    const error = new Error("Hub not found");
    error.statusCode = 404;
    throw error;
  }

  const payload = { ...updateData };

  // Recompute Mapbox geocoding if address or city was changed
  if (
    (updateData.address && updateData.address !== existingHub.address) ||
    (updateData.city && updateData.city !== existingHub.city)
  ) {
    const targetAddress = updateData.address || existingHub.address;
    const targetCity = updateData.city || existingHub.city;
    const { latitude, longitude } = await getCoordinatesFromAddress(
      `${targetAddress}, ${targetCity}`,
    );
    payload.latitude = latitude;
    payload.longitude = longitude;
  }

  if (payload.status) {
    const validStatuses = ["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE"];
    if (!validStatuses.includes(payload.status)) {
      const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }
  }

  return await hubRepository.updateHubRecord(hubId, payload);
};

const assignManager = async (hubId, managerId) => {
  const existingHub = await hubRepository.findHubById(hubId);
  if (!existingHub) {
    const error = new Error("Hub not found");
    error.statusCode = 404;
    throw error;
  }

  if (managerId) {
    const manager = await userRepository.findUserById(managerId);
    if (!manager || manager.role !== "HUB_ADMIN") {
      const error = new Error("Invalid manager. User must exist and have HUB_ADMIN role.");
      error.statusCode = 400;
      throw error;
    }
    return await hubRepository.assignManagerToHub(hubId, managerId);
  }

  return await hubRepository.assignManagerToHub(hubId, null);
};

const removeHub = async (hubId) => {
  return await hubRepository.deleteHubRecord(hubId);
};

module.exports = {
  createNewHub,
  getActiveHubs,
  updateHubDetails,
  assignManager,
  removeHub,
};

