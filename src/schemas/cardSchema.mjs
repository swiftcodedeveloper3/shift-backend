import mongoose from "mongoose";

const cardSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    cardHolderName: {
        type: String,
        required: true,
        trim: true
    },
    cardNumber: {
        type: String,
        required: true
    },
    expiryMonth: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    expiryYear: {
        type: Number,
        required: true
    },
    cvv: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        enum: ['Visa', 'MasterCard', 'American Express', 'Discover', 'Other'],
        default: 'Other'
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Card', cardSchema);

