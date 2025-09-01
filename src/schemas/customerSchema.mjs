import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema({
    id: { type: String, required: true },            // Stripe paymentMethod.id
    brand: String,
    last4: String,
    exp_month: Number,
    exp_year: Number,
    is_default: { type: Boolean, default: false }
}, { _id: false });

const paymentHistorySchema = new mongoose.Schema({
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    amount: Number,
    date: Date
}, { _id: false });

const customerSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    profilePicture: {
        type: String,
    },
    registrationType: {
        type: String,
        enum: ['user'],
        default: 'user'
    },
    password: {
        type: String,
        required: true
    },
    rideHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ride' }],
    currentLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], index: '2dsphere', default: [0, 0] },
        address: String,
        lastUpdated: Date
    },
    bookMarkLocations: [{
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], index: '2dsphere' },
        address: String
    }],
    paymentMethods: [paymentMethodSchema],
    preferredPaymentMethod: {
        type: String,
        enum: ['card', 'wallet'],
        default: 'card'
    },
    cards: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card'
    }],
    notificationsEnabled: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

export default mongoose.model('Customer', customerSchema);