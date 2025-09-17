import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import bcrypt from 'bcryptjs';
import Admin from "../schemas/adminSchema.mjs";
import Driver from '../schemas/driverSchema.mjs';
import Customer from '../schemas/customerSchema.mjs';
import Ride from '../schemas/rideSchema.mjs';
import SupportTicket from '../schemas/supportTicketSchema.mjs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
});


// Admin Login
export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) return res.status(400).json({ message: 'Email and Password are required.' });

        const admin = await Admin.findOne({ email: email.toLowerCase() });

        if (!admin) return res.status(404).json({ message: 'Admin not found.' });

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) return res.status(401).json({ message: 'Admin not found.' });

        const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.cookie('token', token, { httpOnly: true, expires: new Date(Date.now() + 86400000) });



        res.status(200).json({ token, admin });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Login failed', error: err.message });
    }
}

export const adminLogout = async (req, res) => {
    try {
        res.clearCookie('token');
        res.status(200).json({ message: 'Logged out successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Logout failed', error: err.message });
    }
}

export const getAllDrivers = async (req, res) => {
    try {
        const drivers = await Driver.find({});
        res.status(200).json(drivers);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch drivers.', error: err.message });
    }
};

// Approve Driver
export const approveDriver = async (req, res) => {
    try {
        const { driverId, approveStatus } = req.params;

        const driver = await Driver.findById(driverId);
        if (!driver) return res.status(404).json({ message: 'Driver not found.' });

        if (approveStatus === 'rejected') {
            driver.isApproved = false;
            driver.approveStatus = approveStatus;

            driver.save();

            return res.status(200).json({ message: 'Driver rejected successfully.' });
        }

        if (approveStatus === 'approved') {
            driver.isApproved = true;
            driver.approveStatus = approveStatus;

            if (driver.stripeAccountId) return res.status(200).json({ message: 'Driver approved successfully.', driver });

            // const account = await stripe.accounts.create({
            //     type: 'express',
            //     country: driver.country,
            //     capabilities: {
            //         transfers: { requested: true },
            //     },
            // });

            // driver.stripeAccountId = account.id;
        }



        await driver.save();

        res.status(200).json({ message: 'Driver approved successfully.', driver });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Approval failed', error: err.message });
    }
}


export const updateDriver = async (req, res) => {
    try {
        const { driverId } = req.params;
        const { firstName, lastName, email, phoneNumber, licenseNumber, vehicleDetails, address } = req.body;

        const driver = await Driver.findById(driverId);
        if (!driver) return res.status(404).json({ message: 'Driver not found.' });

        const updatedDriver = await Driver.updateOne({
            firstName,
            lastName,
            email,
            phoneNumber,
            licenseNumber,
            vehicleDetails,
            address
        });

        res.status(200).json({ message: 'Driver approved successfully.', driver: updatedDriver });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Approval failed', error: err.message });
    }
}

export const updatePassenger = async (req, res) => {
    try {
        const { passengerId } = req.params;
        const { firstName, lastName, email, phoneNumber, } = req.body;

        const passenger = await Customer.findById(passengerId);
        if (!passenger) return res.status(404).json({ message: 'Passenger not found.' });

        const updatedPassenger = await Customer.updateOne({
            firstName,
            lastName,
            email,
            phoneNumber,
        });

        res.status(200).json({ message: 'Passenger approved successfully.', passenger: updatedPassenger });
    } catch (err) {
        res.status(500).json({ message: 'Approval failed', error: err.message });
    }
}

export const getPessengers = async (req, res) => {
    try {
        const passengers = await Customer.find();
        res.status(200).json({ passengers });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch passengers.', error: err.message });
    }
};

export const getDahboardData = async (req, res) => {
    try {
        const drivers = await Driver.find();
        const passengers = await Customer.find();
        const totalDrivers = drivers.length;
        const totalPassengers = passengers.length;
        const totalCompletedRides = await Ride.find({ status: 'completed' }).countDocuments();
        const totalCancelledRides = await Ride.find({ status: 'canceled' }).countDocuments();

        const recentAddedDrivers = await Driver.find().sort({ createdAt: -1 }).limit(5);
        const recentAddedPassengers = await Customer.find().sort({ createdAt: -1 }).limit(5);


        res.status(200).json({
            totalDrivers, totalPassengers, totalCompletedRides, totalCancelledRides, recentAddedDrivers, recentAddedPassengers
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch dashboard data.', error: err.message });
    }
};

export const getRides = async (req, res) => {
    try {
        const rides = await Ride.find().populate('customer driver');
        const completedRides = await Ride.find({ status: "ride_completed" }).countDocuments();
        const ongoingRides = await Ride.find({
            status: {
                $in: ["requested",
                    "accepted",
                    "driver_arrived",
                    "waiting",
                    "ride_started"]
            }
        }).countDocuments();
        const cancelledRides = await Ride.find({
            status: {
                $in: ["cancelled_by_customer",
                    "cancelled_by_driver"]
            }
        }).countDocuments();


        res.status(200).json({ rides, completedRides, ongoingRides, cancelledRides });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch rides.', error: err.message });
    }
};

export const getSupportTickets = async (req, res) => {
    try {
        
        const tickets = await SupportTicket.find().populate('createdBy');
        const openTickets = await SupportTicket.find({ status: "open" }).countDocuments();
        const closedTickets = await SupportTicket.find({ status: "closed" }).countDocuments();

        res.status(200).json({ tickets, openTickets, closedTickets });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch support tickets.', error: err.message });
    }
};