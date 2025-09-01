import { Router } from "express";
import { saveBookMarkLocation, deleteBookMarkLocation, getBookMarkLocations, getPaymentHistory, getRideHistory } from "../controllers/customerController.mjs";
import { authenticate } from "../middlerware/auth.mjs";

const router = Router();


router.post("/save-bookmark-location", authenticate, saveBookMarkLocation);
router.delete("/delete-bookmark-location", authenticate, deleteBookMarkLocation);
router.get("/get-bookmark-locations", authenticate, getBookMarkLocations);
router.get("/get-payment-history", authenticate, getPaymentHistory);
router.get("/get-ride-history", authenticate, getRideHistory);

// export router
export default router;