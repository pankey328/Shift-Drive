const hubRepository = require("../repositories/hubRepository");
const { getCoordinatesFromAddress } = require("../utils/mapbox");

const createNewHub = async ({
  name,
  city,
  address,
  opening_time,
  closing_time,
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
  });

  return newHub;
};

const getActiveHubs = async () => {
  return await hubRepository.getAllHubs();
};

module.exports = { createNewHub, getActiveHubs };
