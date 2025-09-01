import { goOnline, goOffline, generateOnboardingLink } from "../controllers/driverController.mjs";
import { authenticate } from '../middlerware/auth.mjs';
import express from 'express';

const router = express.Router();

// Driver routes
router.post('/go-online', authenticate, goOnline);
router.post('/go-offline', authenticate, goOffline);
router.post('/generate-onboarding-link', authenticate, generateOnboardingLink);

export default router;
