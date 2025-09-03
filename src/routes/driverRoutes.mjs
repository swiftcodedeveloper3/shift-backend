import { goOnline, goOffline, generateOnboardingLink, getStripeAccountDetails, getTodayGoals, setTodayGoals, getDriverEarnings } from "../controllers/driverController.mjs";
import { authenticate } from '../middlerware/auth.mjs';
import express from 'express';

const router = express.Router();

// Driver routes
router.post('/go-online', authenticate, goOnline);
router.post('/go-offline', authenticate, goOffline);
router.post('/generate-onboarding-link', authenticate, generateOnboardingLink);
router.get('/get-stripe-account-details', authenticate, getStripeAccountDetails);
router.post('/set-today-goals', authenticate, setTodayGoals);
router.get('/get-today-goals', authenticate, getTodayGoals);
router.get('/get-driver-earnings', authenticate, getDriverEarnings);

export default router;
