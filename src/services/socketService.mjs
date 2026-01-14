import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { updateDriverLocation, findNearbyDrivers } from '../utils/geo.mjs';
import { saveNotifiedDrivers, addRejectedDriver, clearAssignment, getNotifiedDrivers, getRejectedDrivers, setRidePending } from './rideService.mjs';
import redisClient from '../config/redisClient.mjs';
import Ride from '../schemas/rideSchema.mjs';


let io;
export const socketUsers = {
    drivers: {},
    users: {}
}

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*', // Allow all origins for development, restrict in production
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log("🟢 SOCKET CONNECTED:", socket.id);
    
        socket.onAny((event, ...args) => {
            console.log("📡 EVENT RECEIVED:", event, args);
        });
    
        socket.on('updateLocation', async (data) => {
            console.log("📍 updateLocation RECEIVED:", data);
        });
    }); 

    // io.use((socket, next) => {
    //     const authHeader = socket.request.headers.authorization;

    //     if (!authHeader) return next(new Error("No token provided."));

    //     const token = authHeader.split(" ")[1];
    //     if (!token) return next(new Error("Invalid token format."));

    //     try {
    //         const decoded = jwt.verify(token, process.env.JWT_SECRET); // ✅ verify, not decode

    //         if (!decoded) return next(new Error("Invalid token."));

    //         socket.request.user = decoded;

    //         // Normalize role key
    //         const roleKey = decoded.registrationType === "driver" ? "drivers" : "users";

    //         socketUsers[roleKey][decoded.id] = socket.id; // ✅ store socket id by userId

    //         socket.join(`${decoded.registrationType}_${decoded.id}`);
    //         console.log(`${decoded.registrationType}_${decoded.id} joined room`);

    //         next();
    //     } catch (error) {
    //         console.error("Socket auth error:", error);
    //         next(new Error("Authentication failed."));
    //     }
    // });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
    
        if (!token) {
            return next(new Error("No token provided."));
        }
    
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
            socket.request.user = decoded;
    
            const roleKey =
                decoded.registrationType === "driver" ? "drivers" : "users";
    
            socket.join(`${decoded.registrationType}_${decoded.id}`);
    
            socketUsers[roleKey][decoded.id] = socket.id;
    
            next();
        } catch (err) {
            console.error("Socket auth error:", err.message);
            next(new Error("Invalid token."));
        }
    });    

    io.on('connection', (socket) => {
        console.log('🔌 Socket connected:', socket.id);

        socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected:', socket.id);
            const userId = socket.request.user.id;
            const roleKey = socket.request.user.registrationType === "driver" ? "drivers" : "users";
            delete socketUsers[roleKey][userId];
        })

        // socket.on('join', ({ userId, role }) => {
        //     socket.join(`${role}_${userId}`);
        //     if (role === 'driver') driverSocketMap.set(userId, socket.id);
        //     if (role === 'user' || role === 'customer') userSocketMap.set(userId, socket.id);
        //     console.log(`${role}_${userId} joined room`);
        // });

        socket.on('updateLocation', async ({ _id, lat, lng, carType, rideId }) => {
            try {
                await redisClient.geoAdd('drivers_locations', {
                    longitude: lng,
                    latitude: lat,
                    member: _id,
                });

                await redisClient.hSet(`driver:${_id}`, {
                    carType: carType,
                    rideId: rideId || ''
                });

                let rideData;

                if (rideId) { rideData = await Ride.findById(rideId) };

                if (rideData && rideData?.customer
                    && rideData?.status !== 'ride_completed'
                    || rideData?.status !== 'cancelled_by_driver'
                    || rideData?.status?.status === 'cancelled_by_customer') {
                    io.to(`user_${rideData?.customer}`).emit('driverLocationUpdate', { _id, lat, lng });
                }

            } catch (err) {
                console.error('updateLocation error', err);
            }
        });

        socket.on('driverAccept', async ({ rideId, driverId }) => {
            try {
                const assigned = await redisClient.set(`ride_assigned:${rideId}`, driverId, { NX: true });
                if (!assigned) {
                    socket.emit('rideAcceptFailed', { rideId, message: 'Ride already taken' });
                    return;
                }

                await redisClient.set(`ride_status:${rideId}`, 'assigned');
                await redisClient.set(`driver_status:${driverId}`, 'on_ride');

                const passengerId = await redisClient.get(`ride_passenger:${rideId}`);
                if (passengerId) {
                    io.to(`user_${passengerId}`).emit('rideAccepted', { rideId, driverId });
                }

                const notified = await getNotifiedDrivers(rideId);
                notified.forEach(dId => {
                    if (dId !== driverId) {
                        io.to(`driver_${dId}`).emit('rideNoLongerAvailable', { rideId });
                    }
                });
            } catch (err) {
                console.error('driverAccept error', err);
            }
        });

        socket.on('driverCancelAfterAccept', async ({ rideId, driverId }) => {
            try {
                const currentAssigned = await redisClient.get(`ride_assigned:${rideId}`);
                if (currentAssigned !== driverId) {
                    await redisClient.set(`driver_status:${driverId}`, 'available');
                    socket.emit('cancelAck', { rideId });
                    return;
                }

                await clearAssignment(rideId);
                await addRejectedDriver(rideId, driverId);
                await redisClient.set(`driver_status:${driverId}`, 'available');

                const notified = await getNotifiedDrivers(rideId);
                const rejected = await getRejectedDrivers(rideId);
                const remaining = notified.filter(d => !rejected.includes(d) && d !== driverId);

                if (remaining.length === 0) {
                    const passengerId = await redisClient.get(`ride_passenger:${rideId}`);
                    io.to(`user_${passengerId}`).emit('noDriversAvailable', { rideId });
                    return;
                }

                remaining.forEach(dId => {
                    io.to(`driver_${dId}`).emit('rideRequested', { rideId });
                });

                await saveNotifiedDrivers(rideId, remaining);
            } catch (err) {
                console.error('driverCancelAfterAccept error', err);
            }
        });
    });
};


// notify driver when a ride is requested
export async function notifyRideRequested(rideData) {
    if (!io) throw new Error('Socket not initialized');

    const { _id, pickupLocation, customer, rideType } = rideData;

    console.log('notifyRideRequested', rideData);

    const rideId = _id.toString();
    const passengerId = customer._id.toString();
    const [lng, lat] = pickupLocation.coordinates;


    const nearbyDrivers = await redisClient.geoRadius(
        'drivers_locations',
        { longitude: lng, latitude: lat, carType: rideType },
        5,
        'km'
    );

    console.log('nearbyDrivers', nearbyDrivers);

    if (!nearbyDrivers || nearbyDrivers.length === 0) {
        io.to(`user_${passengerId?._id}`).emit('noDriversAvailable', { rideId });
        return;
    }

    await saveNotifiedDrivers(rideId, nearbyDrivers);
    await setRidePending(rideId, passengerId);

    
    for (const driverId of nearbyDrivers) {
        const driverData = await redisClient.hGetAll(`driver:${driverId}`);
        if (driverData.carType === rideType) {
            io.to(`driver_${driverId}`).emit('rideRequested', rideData);
        }
    }

    // nearbyDrivers.forEach(dId => {
    //     io.to(`driver_${dId}`).emit('rideRequested', rideData);
    // });
};


// notify customer when a ride is accepted
export const notifyRideAccepted = async (rideData) => {
    if (!io) return;

    const { customer, driver } = rideData;
    const rideId = rideData._id?.toString();

    // 1️⃣ Check ride status in Redis (atomic first-come-first-serve)
    const currentStatus = await redisClient.get(`ride_status:${rideId}`);
    if (currentStatus !== 'pending') {
        // Someone else already took this ride
        io.to(`driver_${driver._id}`).emit('rideAcceptFailed', { rideId, message: 'Ride already assigned' });
        return;
    }

    // 2️⃣ Lock the ride to this driver
    await redisClient.set(`ride_status:${rideId}`, 'assigned');
    await redisClient.set(`ride_driver:${rideId}`, driver._id);

    // 3️⃣ Update driver status
    await redisClient.set(`driver_status:${driver._id}`, 'on_ride');

    // 4️⃣ Notify the customer their ride was accepted
    io.to(`user_${customer}`).emit('rideAccepted', rideData);

    // 5️⃣ Get all other notified drivers from Redis
    const notifiedDriversJSON = await redisClient.get(`ride_notified_drivers:${rideId}`);
    if (notifiedDriversJSON) {
        const notifiedDrivers = JSON.parse(notifiedDriversJSON);

        // 6️⃣ Notify other drivers to reject the ride
        notifiedDrivers.forEach(dId => {
            if (dId !== driver._id) {
                io.to(`driver_${dId}`).emit('rideNoLongerAvailable', { rideId });
            }
        });
    }
};


// notify customer when driver arrives at pickup location
export const notifyDriverArrived = async (rideData) => {
    if (io) {
        io.to(`user_${rideData.customer}`).emit('driverArrived', rideData);

        const rideId = rideData._id;
        if (rideId) {
            await Ride.updateOne(
                { _id: rideId },
                { $set: { status: 'waiting' } }
            );
        }
    }
};

// notify customer when ride is started
export const notifyRideStarted = (rideData) => {
    if (io) {
        io.to(`user_${rideData.customer}`).emit('rideStarted', rideData);
    }
};

// notify customer when ride is completed
export const notifyRideCompleted = async (rideData) => {
    if (io) {
        const [lng, lat] = rideData.dropoffLocation;
        io.to(`user_${rideData.customer}`).emit('rideCompleted', rideData);
        await redisClient.set(`driver_status:${rideData.driver}`, 'available');

        await redisClient.geoAdd('drivers_locations', {
            longitude: lng,
            latitude: lat,
            member: rideData.driver
        });


        console.log(`Driver ${rideData.driver} location updated to dropoff location: ${lat}, ${lng}`);
    }
};

// notify ride cancellation
export const notifyRideCancelled = (rideData) => {
    if (io) {
        io.to(`user_${rideData.customer}`).emit('rideCancelled', rideData);
        io.to(`driver_${rideData.driver}`).emit('rideCancelled', rideData);
    }
};

// emit drivers location to user
export const emitDriversLocation = async (rideData) => {
    if (io) {
        const driverId = rideData.driver;
        const driverLocation = await redisClient.geoPos('drivers_locations', driverId);
        if (driverLocation && driverLocation.length > 0) {
            const [lng, lat] = driverLocation;
            io.to(`user_${rideData.customer}`).emit('driverLocation', { driverId, lat, lng });
        }
    }
};

export const sendMessageSocket = (role, userId, message) => {
    if (io) {
        if (role === 'driver') {
            io.to(`driver_${userId}`).emit('newMessage', message)
        } else {
            io.to(`user_${userId}`).emit('newMessage', message);
        };
    }
};

export const sendCollectItemsReminder = (userId, message) => {
    if (io) {
        io.to(`user_${userId}`).emit('collectItemsReminder', { message });
    }
};

export const getSocketInstance = () => {
    return io;
};