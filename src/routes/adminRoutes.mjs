import { adminLogin, adminLogout, approveDriver, getAllDrivers } from "../controllers/adminController.mjs";
import { adminAuthenticate } from '../middlerware/auth.mjs';
import express from 'express';


const router = express.Router();

// Admin Login Route
router.post('/login', adminLogin);
router.post('/logout', adminAuthenticate, adminLogout);

// Approve Driver Route
router.patch('/drivers/:driverId', adminAuthenticate, approveDriver);

// get all drivers
router.get('/drivers', adminAuthenticate, getAllDrivers);

// Protected Route Example (for authenticated admins)
router.get('/protected', adminAuthenticate, (req, res) => {
    res.status(200).json({ status: true, message: 'This is a protected admin route.', admin: req.admin });
});

// Export the router
export default router;