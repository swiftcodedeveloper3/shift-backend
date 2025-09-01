import redisClient from "../config/redisClient.mjs";

 const updateDriverLocation = async (driverId, lat, lon) => {
  // Store driver's location
  await redisClient.geoAdd("drivers:locations", {
    longitude: lon,
    latitude: lat,
    member: driverId,
  });
  console.log(`Updated location for driver ${driverId}`);
};

const findNearbyDrivers = async (lat, lng, radiusKm = 5) => {
    const drivers = await redisClient.geoSearch('drivers:locations', {
        longitude: lng,
        latitude: lat,
        radius: radiusKm,
        unit: 'km'
    });
    return drivers; // array of driverIds
};

export { updateDriverLocation, findNearbyDrivers };