import Ride from '../schemas/rideSchema.mjs';
import Driver from '../schemas/driverSchema.mjs';
import mongoose from 'mongoose';
import { calculateDistance } from './distanceCalculator.mjs'; // Assuming this utility exists for distance calculation
import { RIDE_TYPES } from "../config/rideTypes.mjs";

// export const fareCalculator = async (pickupLocation, dropoffLocation, rideType) => {
//     try {
//         // Example fare calculation logic
//         const baseFare = 50 ; // Base fare in currency units
//         const distance = await calculateDistance(pickupLocation, dropoffLocation); // Assume this function calculates distance
//         const ratePerKm = rideType === 'mini' ? 20 : 15; // Different rates for different ride types

//         const fare = baseFare + (distance * ratePerKm);
//         return fare;
//     } catch (error) {
//         console.error('Error calculating fare:', error);
//         throw new Error('Fare calculation failed');
//     }
// }

export const fareCalculator = async (pickup, dropoff, rideType) => {
  const rideConfig = RIDE_TYPES[rideType];

  if (!rideConfig) {
    throw new Error("Invalid ride type");
  }

  const distance = calculateDistance(pickup, dropoff);

  if (!distance || isNaN(distance)) {
    throw new Error("Invalid distance calculated");
  }

  const fare =
    rideConfig.baseFare +
    distance * rideConfig.ratePerKm;

  return Math.round(fare);
};