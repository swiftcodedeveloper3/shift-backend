import mongoose from 'mongoose';
import { type } from 'os';

const rideSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
    },
    pickupLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], index: '2dsphere' },
        address: String
    },
    dropoffLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], index: '2dsphere' },
        address: String
    },
    rideType: {
        type: String,
        enum: ['basic', 'premiuim'],
        default: 'basic'
    },
    passengers: {
        type: Number,
        default: 1,
        min: 1,
    },
    amount: {
        type: String,
    },
    fare: {
        type: Number,
    },
    currency: {
        type: String,
        default: 'USD'
    },
    status: {
        type: String,
        enum: [
            "requested",
            "accepted",
            "driver_arrived",
            "waiting",
            "ride_started",
            "ride_completed",
            "cancelled_by_customer",
            "cancelled_by_driver"

        ],
        default: "requested"
    },
    timestamps: {
        requestedAt: Date,
        acceptedAt: Date,
        arrivedAt: Date,
        startedAt: Date,
        completedAt: Date
    },
    distance: Number,
    duration: Number,
    completedAt: Date,
    cancelledAt: Date,
    paymentMethod: {
        type: String,
        enum: ['card', 'wallet'],
        default: 'card'
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    }
}, {
    timestamps: true
});

rideSchema.index({ pickupLocation: '2dsphere', dropoffLocation: '2dsphere' });

export default mongoose.model('Ride', rideSchema);