import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import Driver from '../schemas/driverSchema.mjs';
import Customer from '../schemas/customerSchema.mjs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
});

// Driver Signup
export const driverSignup = async (req, res) => {
    try {
        const { firstName, lastName, email, phoneNumber, country, city, street, password, licenseNumber, carType, make, model, capacity, plateNumber, year, documentNames } = req.body;

        // Handle profile picture
        const profilePicture = req.files?.profilePicture?.[0]?.path || null;

        const profilePhotoUrl = `/${profilePicture?.replace(/\\/g, '/')}` || '';

        // Handle documents (array of files)
        const documents = (req.files?.documents || []).map((file, idx) => ({
            name: Array.isArray(documentNames) ? documentNames[idx] : documentNames || file.originalname,
            url: `/${file.path?.replace(/\\/g, '/')}`,
            uploadedAt: new Date(),
            status: 'pending'
        }));

        // Check if all required fields are provided
        if (!firstName || !lastName || !email || !phoneNumber || !password || !licenseNumber || !carType || !make || !model || !capacity || !plateNumber || !year) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        const existingDriver = await Driver.findOne({ $or: [{ email }, { phoneNumber }, { licenseNumber }] });
        if (existingDriver) return res.status(400).json({ message: 'Driver already exists.' });

        const hashedPassword = await bcrypt.hash(password, 12);

        const driver = new Driver({
            firstName,
            lastName,
            email,
            phoneNumber,
            password: hashedPassword,
            licenseNumber,
            vehicleDetails: {
                carType,
                make,
                model,
                capacity: Number(capacity),
                plateNumber,
                year
            },
            profilePicture: profilePhotoUrl,
            address: {
                country,
                city,
                street
            },
            documents,
            registrationType: 'driver'
        });

        await driver.save();
        res.status(201).json({ message: 'Driver signup request submitted. Await admin approval.' });
    } catch (err) {
        console.error('Driver signup error:', err);
        res.status(500).json({ message: 'Signup failed', error: err.message });
    }
};

// Driver Login
export const driverLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const driver = await Driver.findOne({ email });

        if (!driver) return res.status(404).json({ message: 'Driver not found.' });
        if (!driver.isApproved) return res.status(403).json({ message: 'Driver not approved by admin.' });

        const isMatch = await bcrypt.compare(password, driver.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

        const account = await stripe.accounts.retrieve(driver.stripeAccountId);

        if (account.details_submitted) {
            const token = jwt.sign({ id: driver._id, registrationType: 'driver' }, process.env.JWT_SECRET, { expiresIn: '1d' });
            res.status(200).json({ token, driver });
        } else {
            res.status(403).json({ message: 'Driver onboarding not complete.' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Login failed', error: err.message });
    }
};

// Customer Signup
export const customerSignup = async (req, res) => {
    try {
        const { firstName, lastName, email, phoneNumber, password } = req.body;
        const profilePicture = req.file ? req.file.path : null; // Handle file upload

        const profilePhotoUrl = `/${profilePicture?.replace(/\\/g, '/')}`


        // Check if all required fields are provided
        if (!firstName || !lastName || !email || !phoneNumber || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const existingCustomer = await Customer.findOne({ $or: [{ email }, { phoneNumber }] });
        if (existingCustomer) return res.status(400).json({ message: 'Customer already exists.' });

        const hashedPassword = await bcrypt.hash(password, 12);

        const customer = new Customer({
            firstName,
            lastName,
            email,
            phoneNumber,
            password: hashedPassword,
            profilePicture: profilePhotoUrl,
            registrationType: 'user'
        });

        await customer.save();
        res.status(201).json({ message: 'Customer registered successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Signup failed', error: err.message });
    }
};

// Customer Login
export const customerLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const customer = await Customer.findOne({ email });

        if (!customer) return res.status(404).json({ message: 'Customer not found.' });

        const isMatch = await bcrypt.compare(password, customer.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

        const token = jwt.sign({ id: customer._id, registrationType: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, customer });
    } catch (err) {
        res.status(500).json({ message: 'Login failed', error: err.message });
    }
};

// Get Profile
export const getProfile = async (req, res) => {
    try {
        const userId = req.user._id; // Assuming user is authenticated and userId is available
        const userType = req.user.registrationType === 'driver' ? Driver : Customer;
        const user = await userType.findById(userId).select('-password'); // Exclude password from response

        if (!user) return res.status(404).json({ message: 'User not found.' });

        if (user.registrationType === 'driver' && user.stripeAccountId) {
            const accountBalance = await stripe.balance.retrieve({
                stripeAccount: user.stripeAccountId
            });
            const balance = accountBalance.available[0].currency == "usd" ? accountBalance.available[0].amount / 100 : accountBalance.available[0].amount;

            user.walletBalance = balance;

            driver.checkAndResetGoals();
            
            user.save();
        }

        res.status(200).json(user);
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ message: 'Failed to fetch profile.', error: err.message });
    }
}


// update driver profile
export const updateDriverProfile = async (req, res) => {
    try {
        const userId = req.user._id; // Assuming user is authenticated and userId is available
        const { firstName, lastName, email, phoneNumber, licenseNumber, carType, make, model, plateNumber, year } = req.body;
        const profilePicture = req.file ? req.file.path : null; // Handle file upload

        const profilePhotoUrl = `/${profilePicture?.replace(/\\/g, '/')}`

        const user = await Driver.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        if (currentLocation) {
            typeof currentLocation === 'string' ? user.currentLocation = JSON.parse(currentLocation) : user.currentLocation = currentLocation;
        }

        // Update user fields
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.email = email || user.email;
        user.phoneNumber = phoneNumber || user.phoneNumber;
        user.licenseNumber = licenseNumber || user.licenseNumber;
        user.vehicleDetails = {
            carType: carType || user.vehicleDetails.carType,
            make: make || user.vehicleDetails.make,
            model: model || user.vehicleDetails.model,
            plateNumber: plateNumber || user.vehicleDetails.plateNumber,
            year: year || user.vehicleDetails.year
        };
        user.profilePicture = profilePhotoUrl || user.profilePicture;



        await user.save();
        res.status(200).json({ message: 'Profile updated successfully.', user });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'Failed to update profile.', error: err.message });
    }
}

// update customer profile
export const updateCustomerProfile = async (req, res) => {
    try {
        const userId = req.user._id; // Assuming user is authenticated and userId is available
        const { firstName, lastName, email, phoneNumber, lat, lng, address } = req.body;
        const profilePicture = req.file ? req.file.path : null; // Handle file upload

        const profilePhotoUrl = `/${profilePicture?.replace(/\\/g, '/')}`

        const user = await Customer.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        // Update user fields
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.email = email || user.email;
        user.phoneNumber = phoneNumber || user.phoneNumber;
        user.profilePicture = profilePhotoUrl || user.profilePicture;

        if (lat && lng && address) {
            user.currentLocation = {
                coordinates: [Number(lat), Number(lng)],
                address: address
            };
        }

        await user.save();
        res.status(200).json({ message: 'Profile updated successfully.', user });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'Failed to update profile.', error: err.message });
    }
}

