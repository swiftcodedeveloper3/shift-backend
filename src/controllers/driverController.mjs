import Stripe from 'stripe';
import Driver from "../schemas/driverSchema.mjs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
});

export const goOnline = async (req, res) => {
    try {
        const driverId = req.user._id; // Assuming user is authenticated and driverId is available
        const driver = await Driver.findById(driverId);

        if (!driver) {
            return res.status(404).json({ message: 'Driver not found.' });
        }

        // Set the driver's status to online
        driver.isOnline = true;
        await driver.save();

        res.status(200).json({ message: 'Driver is now online.', driver });
    } catch (err) {
        console.error('Error going online:', err);
        res.status(500).json({ message: 'Failed to set driver online.', error: err.message });
    }
};

export const goOffline = async (req, res) => {
    try {
        const driverId = req.user._id; // Assuming user is authenticated and driverId is available
        const driver = await Driver.findById(driverId);

        if (!driver) {
            return res.status(404).json({ message: 'Driver not found.' });
        }

        // Set the driver's status to offline
        driver.isOnline = false;
        await driver.save();

        res.status(200).json({ message: 'Driver is now offline.', driver });
    } catch (err) {
        console.error('Error going offline:', err);
        res.status(500).json({ message: 'Failed to set driver offline.', error: err.message });
    }
}

export const generateOnboardingLink = async (req, res) => {
    try {
        const { refreshUrl, returnUrl } = req.body;
        const driverId = req.user._id; // Assuming user is authenticated and driverId is available
        const driver = await Driver.findById(driverId);

        if (!driver) {
            return res.status(404).json({ message: 'Driver not found.' });
        }

        // Create a Stripe account link for onboarding
        const accountLink = await stripe.accountLinks.create({
            account: driver.stripeAccountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: 'account_onboarding',
        });

        res.status(200).json({ url: accountLink.url });
    } catch (err) {
        console.error('Error generating onboarding link:', err);
        res.status(500).json({ message: 'Failed to generate onboarding link.', error: err.message });
    }
};
