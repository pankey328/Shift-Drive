const axios = require("axios");

const getCoordinatesFromAddress = async (address) => {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${process.env.MAPBOX_ACCESS_TOKEN}&limit=1`;

    const response = await axios.get(url);

    if (response.data.features && response.data.features.length > 0) {
      // Mapbox returns coordinates as [longitude, latitude]
      const [longitude, latitude] = response.data.features[0].center;
      return { latitude, longitude };
    }

    throw new Error("Address not found on Mapbox");
  } catch (error) {
    console.error("Mapbox Geocoding Error:", error.message);
    throw new Error("Failed to get coordinates for the provided address");
  }
};

module.exports = { getCoordinatesFromAddress };
