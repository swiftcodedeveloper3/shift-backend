import { driverSignup, customerSignup, driverLogin, customerLogin, getProfile, updateCustomerProfile, updateDriverProfile, createSupportTicket } from "../controllers/authController.mjs";
import { authenticate } from '../middlerware/auth.mjs';
import upload from "../config/fileUpload.mjs";
import express from 'express';


const router = express.Router();


// Driver Signup Route
router.post(
  '/driver/signup',
  upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'documents', maxCount: 10 }
  ]),
  driverSignup
);
// Driver Login Route
router.post('/driver/login', driverLogin);
// Customer Signup Route
router.post('/customer/signup', upload.single('profilePicture'), customerSignup);
// Customer Login Route
router.post('/customer/login', customerLogin);
// Get Profile Route
router.get('/profile', authenticate, getProfile);

// update customer profile
router.put('/customer/profile', upload.single('profilePicture'), authenticate, updateCustomerProfile);

// update driver profile
router.put('/driver/profile', upload.single('profilePicture'), authenticate, updateDriverProfile);

router.post('/support', authenticate, createSupportTicket);

// Protected Route Example (for authenticated users)
router.get('/protected', authenticate, (req, res) => {
  res.status(200).json({ message: 'This is a protected route.', user: req.user });
});


// Export the router
export default router;