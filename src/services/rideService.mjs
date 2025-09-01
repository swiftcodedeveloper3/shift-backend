import redisClient from "../config/redisClient.mjs";

/*
 Keys used:
 - ride_status:<rideId> => "pending" | "assigned" | "cancelled" | ...
 - ride_assigned:<rideId> => driverId (set NX on accept)
 - ride_notified_drivers:<rideId> => JSON array of driverIds (initial nearby list)
 - ride_rejected_drivers:<rideId> => JSON array of driverIds who rejected/cancelled
 - ride_passenger:<rideId> => passengerId
*/
export const saveNotifiedDrivers = async (rideId, drivers) => {
    await redisClient.set(`ride_notified_drivers:${rideId}`, JSON.stringify(drivers));
};

export const getNotifiedDrivers = async (rideId) => {
    const val = await redisClient.get(`ride_notified_drivers:${rideId}`);
    return val ? JSON.parse(val) : [];
};

export const addRejectedDriver = async (rideId, driverId) => {
    const key = `ride_rejected_drivers:${rideId}`;
    const cur = await redisClient.get(key);
    const arr = cur ? JSON.parse(cur) : [];
    if (!arr.includes(driverId)) {
        arr.push(driverId);
        await redisClient.set(key, JSON.stringify(arr));
    }
};

export const getRejectedDrivers = async (rideId) => {
    const val = await redisClient.get(`ride_rejected_drivers:${rideId}`);
    return val ? JSON.parse(val) : [];
};

export const setRidePending = async (rideId, passengerId) => {
    await redisClient.set(`ride_status:${rideId}`, 'pending');
    await redisClient.set(`ride_passenger:${rideId}`, passengerId);
};

export const clearAssignment = async (rideId) => {
    await redisClient.del(`ride_assigned:${rideId}`);
    await redisClient.set(`ride_status:${rideId}`, 'pending');
};