import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import Driver from '../schemas/driverSchema.mjs';
import Customer from '../schemas/customerSchema.mjs';
import SupportTicket from '../schemas/supportTicketSchema.mjs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
});


export const driverSignupBasic = async (req, res) => {
    try {
        const { firstName, lastName, email, phoneNumber, password } = req.body;

        const profilePic = req?.file?.path

        const profilePhotoUrl = profilePic && `/${profilePic?.replace(/\\/g, '/')}`;

        console.log(req.body, "req.body");

        // Validate required fields
        if (!firstName || !lastName || !email || !phoneNumber || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Check if driver already exists
        const existingDriver = await Driver.findOne({
            $or: [{ email }, { phoneNumber }]
        });
        if (existingDriver) {
            return res.status(400).json({ message: "Driver already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Create new driver record with minimal info
        const driver = new Driver({
            firstName,
            lastName,
            email,
            profilePicture: profilePhotoUrl,
            phoneNumber,
            password: hashedPassword,
            registrationType: "driver",
        });

        await driver.save();

        res.status(201).json({
            message: "Basic signup successful. Continue to complete your profile.",
            driverId: driver
        });
    } catch (err) {
        console.error("Driver basic signup error:", err);
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0];
            return res.status(400).json({
                message: `Driver already exists with this ${field}.`
            });
        }

        res.status(500).json({ message: "Signup failed", error: err.message });
    }
};

export const driverSignupDetails = async (req, res) => {
    try {
        const {
            country,
            city,
            street,
            licenseNumber,
            carType,
            make,
            model,
            capacity,
            plateNumber,
            year,
            documentNames
        } = req.body;

        const { driverId } = req.params;

        console.log(req.body, "req.body");
        console.log(req.files, "req.files");

        // Find driver by ID
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: "Driver not found." });
        }

        // Handle profile picture
        const profilePicture = req.files?.profilePicture?.[0]?.path || null;
        let profilePhotoUrl = profilePicture
            ? `/${profilePicture.replace(/\\/g, "/")}`
            : driver.profilePicture;

        // Handle documents
        const documents = (req.files?.documents || []).map((file, idx) => ({
            name: Array.isArray(documentNames)
                ? documentNames[idx]
                : documentNames || file.originalname,
            url: `/${file.path?.replace(/\\/g, "/")}`,
            uploadedAt: new Date(),
            status: "pending"
        }));

        // Validate required vehicle and license fields
        if (
            !licenseNumber ||
            !carType ||
            !make ||
            !model ||
            !capacity ||
            !plateNumber ||
            !year
        ) {
            return res.status(400).json({ message: "All vehicle details are required." });
        }

        // Update driver details
        driver.licenseNumber = licenseNumber;
        driver.vehicleDetails = {
            carType,
            make,
            model,
            capacity: Number(capacity),
            plateNumber,
            year
        };
        driver.profilePicture = profilePhotoUrl;
        driver.address = { country, city, street };
        driver.documents = documents;
        driver.approveStatus = 'pending';

        await driver.save();

        res
            .status(200)
            .json({ message: "Driver details submitted, pending admin approval", driver });
    } catch (err) {
        console.error("Driver signup details error:", err);
        res.status(500).json({ message: "Details submission failed", error: err.message });
    }
};



// Driver Login
export const driverLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(email, "email");
        const driver = await Driver.findOne({ email: email });
        console.log(driver, "driver");

        if (!driver) return res.status(404).json({ message: 'Driver not found.' });

        const isMatch = await bcrypt.compare(password, driver.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

        if (!driver.isApproved && driver.documents.length > 0) return res.status(403).json({ message: 'Driver not approved by admin.', driver });



        // let account;
        // if (driver.stripeAccountId) {
        //     account = await stripe.accounts.retrieve(driver.stripeAccountId);
        // }

        // if (account?.details_submitted) {
        const token = jwt.sign({ id: driver._id, registrationType: 'driver' }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.status(200).json({ token, driver });
        // } else {
        //     res.status(403).json({ message: 'Driver onboarding not complete.' });
        // }
    } catch (err) {
        res.status(500).json({ message: 'Login failed', error: err.message });
    }
};

// Customer Signup
export const customerSignup = async (req, res) => {
    try {
        const { firstName, lastName, email, phoneNumber, password } = req.body;
        const profilePicture = req.file ? req.file.path : null; // Handle file upload

        let profilePhotoUrl = ''
        if (profilePicture) {
            profilePhotoUrl = `/${profilePicture?.replace(/\\/g, '/')}`
        };

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

export const createSupportTicket = async (req, res) => {
    try {
        const { subject, description } = req.body;
        const userId = req.user._id; // Assuming user is authenticated and userId is available

        const supportTicket = new SupportTicket({
            subject,
            description,
            createdBy: userId,
            createdBySchema: req.user.registrationType === 'driver' ? 'Driver' : 'Customer',
            createdAt: new Date()
        });

        await supportTicket.save();
        res.status(201).json({ message: 'Support ticket created successfully.', supportTicket });
    } catch (err) {
        console.error('Error creating support ticket:', err);
        res.status(500).json({ message: 'Failed to create support ticket.', error: err.message });
    }
};

export const changePassword = async (req, res) => {
    try {
        const userId = req.user._id; // Assuming user is authenticated and userId is available
        const userType = req.user.registrationType === 'driver' ? Driver : Customer;
        const { currentPassword, newPassword } = req.body;
        const user = await userType.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid current password.' });
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        await user.save();

        const token = jwt.sign({ id: user._id, registrationType: req.user.registrationType }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.status(200).json({ token, user, message: 'Password changed successfully.' });

        res.status(200).json({ message: 'Password changed successfully.' });
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({ message: 'Failed to change password.', error: err.message });
    }
};