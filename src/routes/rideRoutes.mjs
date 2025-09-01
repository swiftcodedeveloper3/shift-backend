import express from 'express';
import { requestRide, acceptRequest, driverArrived, startRide, completeRide, cancelRide } from "../controllers/rideController.mjs";
import { authenticate } from '../middlerware/auth.mjs';

const router = express.Router();


// Ride request route
router.post('/request', authenticate, requestRide);
// Accept ride request route
router.post('/accept', authenticate, acceptRequest);    
// Driver arrived at pickup location route
router.post('/arrived', authenticate, driverArrived);
// Start ride route
router.post('/start', authenticate, startRide); 
// Complete ride route
router.post('/complete', authenticate, completeRide);
// Cancel ride route
router.post('/cancel', authenticate, cancelRide);

// Export the router
export default router;