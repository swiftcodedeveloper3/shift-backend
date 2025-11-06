import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    name: String, // e.g. "License", "ID Card", "Insurance"
    url: String,  // File storage URL or path
    uploadedAt: {
        type: Date,
        default: Date.now
    },
}, { _id: false });

const paymentMethodSchema = new mongoose.Schema({
    id: { type: String },            // Stripe paymentMethod.id
    brand: String,
    last4: String,
    exp_month: Number,
    exp_year: Number,
    is_default: { type: Boolean, default: false }
}, { _id: false });

const goalSchema = new mongoose.Schema({
    rideCount: {
        type: Number,
    },
    totalDistance: {
        type: Number,
    },
    totalFare: {
        type: Number,
    },
    totalDuration: {
        type: Number,
    },
    note: {
        type: String,
    },
}, {
    timestamps: true
});

const driverSchema = new mongoose.Schema({
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
    address: {
        country: String,
        city: String,
        street: String,
    },
    registrationType: {
        type: String,
        enum: ['driver'],
        default: 'driver'
    },
    password: {
        type: String,
        required: true
    },
    licenseNumber: {
        type: String,
    },
    vehicleDetails: {
        carType: {
            type: String,
            enum: ['basic', 'premium'],
        },
        capacity: {
            type: Number,
        },
        make: String,
        model: String,
        year: Number,
        plateNumber: String
    },
    documents: [documentSchema], // Flexible array for any uploaded document
    paymentMethods: [paymentMethodSchema], // Flexible array for any payment method
    isActive: {
        type: Boolean,
        default: false
    },
    isApproved: {
        type: Boolean,
        default: false // Driver must be approved by admin to login
    },
    approveStatus:{
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    isOnline: {
        type: Boolean,
        default: false // To track if the driver is currently online
    },
    status: {
        type: String,
        enum: ['available', 'on_ride', 'offline'],
        default: 'available' // Current status of the driver
    },
    currentLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], index: '2dsphere', default: [0, 0] },
        address: String,
        lastUpdated: Date
    },
    rideHistory: [{
        rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
        fare: Number,
        date: Date,
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }
    }],
    preferredPaymentMethod: {
        type: String,
        enum: ['card', 'wallet'],
        default: 'card' // Default payment method for the driver
    },
    stripeAccountId: {
        type: String,
        default: null // To store the Stripe account ID for payouts
    },
    subscription: {
        subscriptionId: String,
        priceId: String,
        status: Boolean,
        subscriptionType: String,
        startDate: Date,
        endDate: Date,
        default: {}
    },
    // cards: [{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Card'
    // }],
    walletBalance: {
        type: Number,
        default: 0 // To track driver's wallet balance
    },
    averageRating: {
        type: Number,
        min: 1,
        max: 5,
        default: 5 // Default rating for new drivers
    },
    totalRides: {
        type: Number,
        default: 0 // Total number of rides completed by the driver
    },
    totalEarnings: {
        type: Number,
        default: 0 // Total earnings from completed rides
    },
    tips: {
        type: Number,
        default: 0 // Total tips received by the driver
    },
    lastRide: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ride' // Reference to the last ride taken by the driver
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    todayGoals: {
        goals: [goalSchema],
        date: {
            type: Date,
        }
    }
}, { timestamps: true });


driverSchema.index({ currentLocation: '2dsphere' }); // Index for geospatial queries

driverSchema.methods.checkAndResetGoals = function () {
    const today = new Date().setHours(0, 0, 0, 0);
    const goalDate = this.todayGoals?.date?.setHours(0, 0, 0, 0);

    if (goalDate && goalDate < today) {
        this.todayGoals = { goals: [], date: new Date() };
    }
};


export default mongoose.model('Driver', driverSchema);