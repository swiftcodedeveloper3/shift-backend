import Driver from "../schemas/driverSchema.mjs";
import Customer from "../schemas/customerSchema.mjs";
import Notification from "../schemas/notificationSchema.mjs";
import Ride from "../schemas/rideSchema.mjs";


export const getAllUserNotifications = async (req, res) => {
    try {
        const user = req.user;
        const notifications = await Notification.find({ user: user._id }).sort({ createdAt: -1 }).populate({path: "user", model: user.registrationType === "driver" ? "Driver" : "Customer"});
        res.status(200).json(notifications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const addNotification = async (req, res) => {
    try {
        const { user } = req;
        const { title, body } = req.body;
        const notification = new Notification({
            user: user._id,
            userType: user.registrationType,
            title: title,
            body: body,
            date: new Date()
        });
        await notification.save();
        res.status(200).json(notification);
    } catch (err) {
        console.log(err);
    }
};