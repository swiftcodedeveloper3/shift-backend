import mongoose from "mongoose";


const supportTicketSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'createdBySchema'
    },
    createdBySchema: {
        type: String,
        enum: ['Customer', 'Driver'],
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });


export default mongoose.model('SupportTicket', supportTicketSchema);