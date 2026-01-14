import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import redisClient from "../config/redisClient.mjs";
import Ride from "../schemas/rideSchema.mjs";

let io;

export const socketUsers = {
  drivers: {},
  users: {},
};

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  /* =========================
     AUTH MIDDLEWARE
  ========================= */
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log("❌ SOCKET: No token provided");
      return next(new Error("No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded?.id || !decoded?.registrationType) {
        return next(new Error("Invalid token payload"));
      }

      socket.user = decoded;

      const room = `${decoded.registrationType}_${decoded.id}`;
      socket.join(room);

      const roleKey =
        decoded.registrationType === "driver" ? "drivers" : "users";

      socketUsers[roleKey][decoded.id] = socket.id;

      console.log("✅ SOCKET AUTH OK");
      console.log("Joined room:", room);

      next();
    } catch (err) {
      console.log("❌ SOCKET AUTH ERROR:", err.message);
      next(new Error("Invalid token"));
    }
  });

  /* =========================
     CONNECTION
  ========================= */
  io.on("connection", (socket) => {
    console.log("🟢 SOCKET CONNECTED:", socket.id);
    console.log("Host:", socket.handshake.headers.host);

    // catch ALL events (debug)
    socket.onAny((event, data) => {
      console.log("📡 EVENT:", event, data);
    });

    socket.emit("serverPing", "pong");

    /* =========================
       DRIVER LOCATION UPDATE
    ========================= */
    socket.on("updateLocation", async (data) => {
      try {
        const { lat, lng, carType } = data;
        const driverId = socket.user.id;

        if (!lat || !lng) return;

        await redisClient.geoAdd("drivers_locations", {
          longitude: lng,
          latitude: lat,
          member: driverId,
        });

        await redisClient.hSet(`driver:${driverId}`, {
          carType: carType || "",
        });

        console.log("📍 LOCATION SAVED:", driverId, lat, lng);
      } catch (err) {
        console.error("❌ updateLocation error:", err);
      }
    });

    socket.on("disconnect", () => {
      const roleKey =
        socket.user?.registrationType === "driver" ? "drivers" : "users";

      if (socket.user) {
        delete socketUsers[roleKey][socket.user.id];
      }

      console.log("🔴 SOCKET DISCONNECTED:", socket.id);
    });
  });
};

/* =========================
   RIDE REQUEST NOTIFY
========================= */
export const notifyRideRequested = async (rideData) => {
  if (!io) return;

  const { _id, pickupLocation, rideType, customer } = rideData;
  const rideId = _id.toString();

  const [lng, lat] = pickupLocation.coordinates;

  console.log("🚕 notifyRideRequested:", rideId);

  // 🔥 CORRECT geoRadius usage
  const nearbyDrivers = await redisClient.geoRadius(
    "drivers_locations",
    lng,
    lat,
    5,
    "km"
  );

  console.log("Nearby drivers:", nearbyDrivers);

  if (!nearbyDrivers || nearbyDrivers.length === 0) {
    io.to(`user_${customer}`).emit("noDriversAvailable", { rideId });
    return;
  }

  for (const driverId of nearbyDrivers) {
    const driverData = await redisClient.hGetAll(`driver:${driverId}`);

    if (driverData.carType === rideType) {
      io.to(`driver_${driverId}`).emit("rideRequested", rideData);
      console.log("📨 Ride sent to driver:", driverId);
    }
  }
};

export const getSocketInstance = () => io;
