import { Router } from "express";
import {
    createPaymentIntent, attachPaymentMethod, detachPaymentMethod, listMethods, setDefaultPaymentMethod, cancelDriverSubscription, createDriverSubscription, createRidePaymentIntent
} from "../controllers/paymentController.mjs";
import { authenticate } from "../middlerware/auth.mjs";

const router = Router();


// create payment intent
router.post("/create-payment-intent", authenticate, createPaymentIntent);

// attach payment method
router.post("/attach-payment-method", authenticate, attachPaymentMethod);

// list payment methods
router.get("/list-payment-methods", authenticate, listMethods);

// detach payment method
router.post("/detach-payment-method", authenticate, detachPaymentMethod);

// set default payment method
router.post("/set-default-payment-method", authenticate, setDefaultPaymentMethod);

// create driver subscription
router.post("/create-driver-subscription", authenticate, createDriverSubscription);

// create ride payment intent
router.post("/create-ride-payment-intent", authenticate, createRidePaymentIntent);

// Cancel driver subscription
router.post("/cancel-driver-subscription", authenticate, cancelDriverSubscription);

// Export the router
export default router;