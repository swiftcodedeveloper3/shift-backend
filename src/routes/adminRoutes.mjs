import { adminLogin, approveDriver, getAllDrivers } from "../controllers/adminController.mjs";
import { adminAuthenticate } from '../middlerware/auth.mjs';
import express from 'express';


const router = express.Router();

// Admin Login Route
router.post('/login', adminLogin);

// Approve Driver Route
router.post('/driver/approve', adminAuthenticate, approveDriver);

// get all drivers
router.get('/drivers', adminAuthenticate, getAllDrivers);

// Protected Route Example (for authenticated admins)
router.get('/admin/protected', adminAuthenticate, (req, res) => {
    res.status(200).json({ message: 'This is a protected admin route.', admin: req.admin });
});

// Export the router
export default router;