import Customer from '../schemas/customerSchema.mjs';
import Driver from '../schemas/driverSchema.mjs';
import Ride from '../schemas/rideSchema.mjs';
import Chat from '../schemas/chatSchema.mjs';
import { sendMessageSocket } from '../services/socketService.mjs';



export const getChat = async (req, res) => {
    try {
        const { sender } = req.query;

        const chats = await Chat.find({
            $or: [
                { sender: sender, receiver: req?.user?._id },
                { sender: req?.user?._id, receiver: sender }
            ]
        }).sort({ timestamp: 1 });

        res.status(200).json({ chats });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { receiver, message } = req.body;

        const senderModel = req?.user?.registrationType === "driver" ? "Driver" : "Customer";

        const newChat = await Chat.create({
            sender: req?.user?._id,
            senderModel: senderModel,
            receiver: receiver,
            receiverModel: senderModel === "Driver" ? "Customer" : "Driver",
            message: message
        })

        sendMessageSocket(req?.user?.registrationType, receiver, message);

        res.status(201).json({ message: "Message sent successfully", chat: newChat });

    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
};