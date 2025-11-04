import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import bcrypt from 'bcryptjs';
import Admin from "../schemas/adminSchema.mjs";
import Driver from '../schemas/driverSchema.mjs';
import Customer from '../schemas/customerSchema.mjs';
import Ride from '../schemas/rideSchema.mjs';
import SupportTicket from '../schemas/supportTicketSchema.mjs';
import Setting from '../schemas/settingSchema.mjs';

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

            // if (driver.stripeAccountId)
                 return res.status(200).json({ message: 'Driver approved successfully.', driver });

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
        const totalCompletedRides = await Ride.find({ status: 'ride_completed' }).countDocuments();
        const totalCancelledRides = await Ride.find({ $or: [{ status: 'cancelled_by_customer' }, { status: 'cancelled_by_driver' }] }).countDocuments();

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
        console.log(err);
        res.status(500).json({ message: 'Failed to fetch support tickets.', error: err.message });
    }
};

export const closeSupportTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body;

        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found.' });

        ticket.status = status;
        await ticket.save();

        res.status(200).json({ message: 'Ticket closed successfully.', ticket });
    } catch (err) {
        res.status(500).json({ message: 'Failed to close ticket.', error: err.message });
    }
};

export const addNewRegion = async (req, res) => {
    try {
        const { region } = req.body;
        if (!region) return res.status(400).json({ message: 'Region is required.' });

        // Check if the region already exists
        const existingRegion = await Setting.findOne({
            serviceRegions: {
                $elemMatch: { name: new RegExp(`^${region}$`, "i") }
            }
        });

        if (existingRegion) return res.status(400).json({ message: 'Region already exists.' });
        const setting = await Setting.findOne();
        if (!setting) {
            const newSetting = new Setting({ serviceRegions: [{ name: region }] });
            await newSetting.save();
            return res.status(201).json({ message: 'New region added successfully.', region: newSetting.serviceRegions });
        }
        setting.serviceRegions.push({ name: region });
        await setting.save();

        res.status(201).json({ message: 'New region added successfully.', regions: setting.serviceRegions });
    } catch (err) {
        res.status(500).json({ message: 'Failed to add new region.', error: err.message });
    }
};

export const deleteRegion = async (req, res) => {
    try {
        const { regionId } = req.params;
        if (!regionId) return res.status(400).json({ message: 'Region ID is required.' });

        const setting = await Setting.findOne();
        if (!setting) return res.status(404).json({ message: 'Settings not found.' });

        setting.serviceRegions = setting.serviceRegions.filter(r => r._id.toString() !== regionId);
        await setting.save();

        res.status(200).json({ message: 'Region deleted successfully.', regions: setting.serviceRegions });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete region.', error: err.message });
    }
};

export const updateNotificationSettings = async (req, res) => {
    try {
        const { email, sms, push } = req.body;

        const setting = await Setting.findOne();
        if (!setting) return res.status(404).json({ message: 'Settings not found.' });

        setting.notifications = { email, sms, push };
        await setting.save();

        res.status(200).json({ message: 'Notification settings updated successfully.', settings: setting.notifications });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update notification settings.', error: err.message });
    }
};

export const getSettings = async (req, res) => {
    try {
        const settings = await Setting.findOne();

        console.log(settings);
        res.status(200).json({ settings });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch settings.', error: err.message });
    }
};
