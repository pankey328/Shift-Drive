const hubRepository = require("../repositories/hubRepository");
const userRepository = require("../repositories/userRepository");
const { getCoordinatesFromAddress } = require("../utils/mapbox");

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

const createNewHub = async ({
  name,
  city,
  address,
  opening_time,
  closing_time,
  capacity = 20,
  latitude = null,
  longitude = null,
  manager_id,
}) => {
  let finalLat = latitude ? parseFloat(latitude) : null;
  let finalLng = longitude ? parseFloat(longitude) : null;

  // If coordinates were not explicitly pinned on map, geocode via Mapbox
  if (!finalLat || !finalLng || isNaN(finalLat) || isNaN(finalLng)) {
    const coords = await getCoordinatesFromAddress(`${address}, ${city}`);
    finalLat = coords.latitude;
    finalLng = coords.longitude;
  }

  const newHub = await hubRepository.createHub({
    name,
    city,
    address,
    latitude: finalLat,
    longitude: finalLng,
    opening_time,
    closing_time,
    capacity: parseInt(capacity, 10) || 20,
    ...(manager_id && { manager_id }),
  });

  return newHub;
};

const getActiveHubs = async (userCoords = null) => {
  const hubs = await hubRepository.getAllHubs();

  if (userCoords && userCoords.lat && userCoords.lng) {
    const userLat = parseFloat(userCoords.lat);
    const userLng = parseFloat(userCoords.lng);

    if (!isNaN(userLat) && !isNaN(userLng)) {
      return hubs
        .map((hub) => {
          const hubData = hub.toJSON ? hub.toJSON() : { ...hub };
          if (hubData.latitude && hubData.longitude) {
            hubData.distance_km = calculateHaversineDistance(
              userLat,
              userLng,
              parseFloat(hubData.latitude),
              parseFloat(hubData.longitude)
            );
          } else {
            hubData.distance_km = null;
          }
          return hubData;
        })
        .sort((a, b) => {
          if (a.distance_km === null) return 1;
          if (b.distance_km === null) return -1;
          return a.distance_km - b.distance_km;
        });
    }
  }

  return hubs;
};

const updateHubDetails = async (hubId, updateData) => {
  const existingHub = await hubRepository.findHubById(hubId);
  if (!existingHub) {
    const error = new Error("Hub not found");
    error.statusCode = 404;
    throw error;
  }

  const payload = { ...updateData };

  // Explicit pinned GPS coordinates take precedence
  if (updateData.latitude !== undefined && updateData.longitude !== undefined) {
    payload.latitude = parseFloat(updateData.latitude);
    payload.longitude = parseFloat(updateData.longitude);
  } else if (
    (updateData.address && updateData.address !== existingHub.address) ||
    (updateData.city && updateData.city !== existingHub.city)
  ) {
    // Recompute Mapbox geocoding if address or city was changed and no explicit coords provided
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

