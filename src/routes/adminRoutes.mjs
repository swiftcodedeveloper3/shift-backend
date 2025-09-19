import { adminLogin, adminLogout, updateDriver, approveDriver, getAllDrivers, getPessengers, getDahboardData, updatePassenger, getRides, getSupportTickets, closeSupportTicket } from "../controllers/adminController.mjs";
import { adminAuthenticate } from '../middlerware/auth.mjs';
import express from 'express';


const router = express.Router();

// Admin Login Route
router.post('/login', adminLogin);
router.post('/logout', adminAuthenticate, adminLogout);

// Approve Driver Route
router.put('/drivers/:driverId/:approveStatus', adminAuthenticate, approveDriver);

router.put('/drivers/:driverId', adminAuthenticate, updateDriver);

// get all drivers
router.get('/drivers', adminAuthenticate, getAllDrivers);

// get all passengers
router.get('/passengers', adminAuthenticate, getPessengers);

router.put('/passengers/:passengerId', adminAuthenticate, updatePassenger);

router.get('/dashboard', adminAuthenticate, getDahboardData);

router.get('/rides', adminAuthenticate, getRides);

router.get('/support', adminAuthenticate, getSupportTickets);

router.put('/support/:ticketId', adminAuthenticate, closeSupportTicket);

// Protected Route Example (for authenticated admins)
router.get('/protected', adminAuthenticate, (req, res) => {
    res.status(200).json({ status: true, message: 'This is a protected admin route.', admin: req.admin });
});

// Export the router
export default router;