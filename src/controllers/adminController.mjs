import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import bcrypt from 'bcryptjs';
import Admin from "../schemas/adminSchema.mjs";
import Driver from '../schemas/driverSchema.mjs';



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

        res.cookie('token', token, { httpOnly: true,  expires: new Date(Date.now() + 86400000) });



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
        const drivers = await Driver.find({ isApproved: false });
        res.status(200).json(drivers);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch drivers.', error: err.message });
    }
};

// Approve Driver
export const approveDriver = async (req, res) => {
    try {
        const { driverId } = req.params;
        const { approveStatus } = req.body;

        const driver = await Driver.findById(driverId);
        if (!driver) return res.status(404).json({ message: 'Driver not found.' });



        if (approveStatus === 'rejected') {
            driver.isApproved = false;
            driver.approveStatus = approveStatus;

            driver.save();

            return res.status(200).json({ message: 'Driver rejected successfully.' });
        }

        driver.isApproved = true;
        driver.approveStatus = approveStatus;

        // const account = await stripe.accounts.create({
        //     type: 'express',
        //     country: driver.country,
        //     capabilities: {
        //         transfers: { requested: true },
        //     },
        // });

        // driver.stripeAccountId = account.id;

        await driver.save();

        res.status(200).json({ message: 'Driver approved successfully.', driver });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Approval failed', error: err.message });
    }
}