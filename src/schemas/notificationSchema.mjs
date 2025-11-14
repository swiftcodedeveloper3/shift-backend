import mongoose from "mongoose";

const notification = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    userType: {
        type: String,
        enum: ["customer", "driver"],
        required: true,
    },
});

export default mongoose.model("Notification", notification);