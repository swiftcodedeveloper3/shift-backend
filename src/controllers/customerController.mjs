import Customer from '../schemas/customerSchema.mjs';
import Payment from '../schemas/paymentSchema.mjs'
import Ride from '../schemas/rideSchema.mjs';


export const saveBookMarkLocation = async (req, res) => {
    try {
        const { latitude, longitude, address } = req.body;

        const customer = await Customer.findById(req.user._id);

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        if (customer.bookMarkLocations.find(bl => bl.address === address)) {
            return res.status(400).json({ message: 'Bookmark location already exists' });
        };

        customer.bookMarkLocations.push({ coordinates: [longitude, latitude], address });

        await customer.save();

        return res.status(200).json({ message: 'Bookmark location saved successfully', customer });

    } catch (error) {
        console.error('Error saving bookmark location:', error);
        return res.status(500).json({ message: 'Error saving bookmark location', error: error.message });
    }
};

export const getBookMarkLocations = async (req, res) => {
    try {
        const customer = await Customer.findById(req.user._id);

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        return res.status(200).json({ message: 'Bookmark locations retrieved successfully', bookMarkLocations: customer.bookMarkLocations });

    } catch (error) {
        console.error('Error retrieving bookmark locations:', error);
        return res.status(500).json({ message: 'Error retrieving bookmark locations', error: error.message });
    }
};

export const deleteBookMarkLocation = async (req, res) => {
    try {
        const { address } = req.body;

        const customer = await Customer.findById(req.user._id);

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const index = customer.bookMarkLocations.findIndex(bl => bl.address === address);

        if (index === -1) {
            return res.status(404).json({ message: 'Bookmark location not found' });
        }

        customer.bookMarkLocations.splice(index, 1);

        await customer.save();

        return res.status(200).json({ message: 'Bookmark location deleted successfully', customer });

    } catch (error) {
        console.error('Error deleting bookmark location:', error);
        return res.status(500).json({ message: 'Error deleting bookmark location', error: error.message });
    }
};

export const getPaymentHistory = async (req, res) => {
    try {
        const customer = await Customer.findById(req.user._id);

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const payments = await Payment.find({ payer: customer._id }).populate('receiver').populate('ride').sort({ paymentDate: -1 });

        return res.status(200).json({ message: 'Payment history retrieved successfully', payments });

    } catch (error) {
        console.error('Error retrieving payment history:', error);
        return res.status(500).json({ message: 'Error retrieving payment history', error: error.message });
    }
};

export const getRideHistory = async (req, res) => {
    try {
        const customer = await Customer.findById(req.user._id);

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const rides = await Ride.find({ customer: customer._id }).populate('driver').sort({ rideDate: -1 });

        return res.status(200).json({ message: 'Ride history retrieved successfully', rides });

    } catch (error) {
        console.error('Error retrieving ride history:', error);
        return res.status(500).json({ message: 'Error retrieving ride history', error: error.message });
    }
};