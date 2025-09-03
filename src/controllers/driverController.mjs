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

export const getStripeAccountDetails = async (req, res) => {
    try {
        const driverId = req.user._id; // Assuming user is authenticated and driverId is available
        const driver = await Driver.findById(driverId);

        if (!driver) {
            return res.status(404).json({ message: 'Driver not found.' });
        }

        // Retrieve Stripe account details
        const account = await stripe.accounts.retrieve(driver.stripeAccountId);

        res.status(200).json({ account });
    } catch (err) {
        console.error('Error retrieving Stripe account details:', err);
        res.status(500).json({ message: 'Failed to retrieve Stripe account details.', error: err.message });
    }
};

export const setTodayGoals = async (req, res) => {
    try {
        const driverId = req.user._id; // Assuming user is authenticated and driverId is available
        const { todayGoals } = req.body;
        const driver = await Driver.findById(driverId);

        if (!driver) {
            return res.status(404).json({ message: 'Driver not found.' });
        }

        // Set today's goals
        driver.todayGoals = { todayGoals, date: new Date() };
        await driver.save();

        res.status(200).json({ message: 'Today\'s goals set successfully.', driver });
    } catch (err) {
        console.error('Error setting today\'s goals:', err);
        res.status(500).json({ message: 'Failed to set today\'s goals.', error: err.message });
    }
};

export const getTodayGoals = async (req, res) => {
    try {
        const driverId = req.user._id; // Assuming user is authenticated and driverId is available
        const driver = await Driver.findById(driverId);

        if (!driver) {
            return res.status(404).json({ message: 'Driver not found.' });
        }

        if (driver.todayGoals.length === 0) return res.status(200).json({ message: 'Today\'s goals not set.' })

        driver.checkAndResetGoals();
        await driver.save();

        // Retrieve today's goals
        const todayGoals = driver.todayGoals;

        res.status(200).json({ todayGoals });
    } catch (err) {
        console.error('Error retrieving today\'s goals:', err);
        res.status(500).json({ message: 'Failed to retrieve today\'s goals.', error: err.message });
    }
};

export const getDriverEarnings = async (req, res) => {
    try {
        const driverId = req.user._id; // Assuming user is authenticated and driverId is available
        const driver = await Driver.findById(driverId);

        if (!driver) {
            return res.status(404).json({ message: 'Driver not found.' });
        }

        async function getTodaysEarnings(connectAccountId) {
            const startOfDay = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000);
            const now = Math.floor(Date.now() / 1000);

            const balanceTxns = await stripe.balanceTransactions.list({
                limit: 100,
                created: { gte: startOfDay, lte: now },
            }, {
                stripeAccount: connectAccountId,
            });

            const total = balanceTxns.data.reduce((sum, txn) => sum + txn.net, 0);
            return total / 100; // Convert cents to currency
        }

        async function getPastWeekEarnings(connectAccountId) {
            const oneWeekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
            const now = Math.floor(Date.now() / 1000);

            const balanceTxns = await stripe.balanceTransactions.list({
                limit: 100,
                created: { gte: oneWeekAgo, lte: now },
            }, {
                stripeAccount: connectAccountId,
            });

            const total = balanceTxns.data.reduce((sum, txn) => sum + txn.net, 0);
            return total / 100;
        }

        // ✅ Call both functions
        const [todaysEarnings, pastWeekEarnings] = await Promise.all([
            getTodaysEarnings(driver.connectAccountId),
            getPastWeekEarnings(driver.connectAccountId)
        ]);

        // ✅ Send response
        return res.json({
            today: todaysEarnings,
            pastWeek: pastWeekEarnings
        });

    } catch (err) {
        console.error('Error retrieving driver earnings:', err);
        res.status(500).json({
            message: 'Failed to retrieve driver earnings.',
            error: err.message
        });
    }
};
