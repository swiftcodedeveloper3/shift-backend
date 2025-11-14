import express from "express"
import { authenticate } from "../middlerware/auth.mjs";
import { getAllUserNotifications, addNotification } from "../controllers/notificationController.mjs";

const router = express.Router();


router.get("/", authenticate, getAllUserNotifications);
router.post("/add", authenticate, addNotification);

export default router;
