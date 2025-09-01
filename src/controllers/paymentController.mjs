import Stripe from "stripe";
import Customer from "../schemas/customerSchema.mjs";
import Driver from "../schemas/driverSchema.mjs";
import Payment from "../schemas/paymentSchema.mjs";
import { ensureStripeCustomer } from "../utils/stripe.mjs";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
});


export const createPaymentIntent = async (req, res) => {
    try {

        const customer = req?.registrationType === 'user' ? await Customer.findById(req?.user?._id) : await Driver.findById(req?.user?._id);
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        const stripeCustomerId = await ensureStripeCustomer(customer);

        const paymentIntent = await stripe.paymentIntents.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
        });

        res.status(200).json({ message: "Payment intent created successfully", clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Error setting up payment intent:', error);
        res.status(500).json({ message: "Error setting up payment intent", error: error.message });
    }
};

export const attachPaymentMethod = async (req, res) => {
    try {

        const { paymentMethodId } = req.body;

        const user = req?.registrationType === 'user' ? await Customer.findById(req?.user?._id) : await Driver.findById(req?.user?._id);
        if (!user) {
            return res.status(404).json({ message: "Customer not found" });
        }

        const stripeCustomerId = await ensureStripeCustomer(user);

        const paymentMethods = await stripe.paymentMethods.list({
            customer: stripeCustomerId,
            type: 'card',
        });

        await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });


        if (paymentMethods.data.length === 0) {
            await stripe.customers.update(stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });

        }

        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        const card = {
            id: pm.id,
            brand: pm.card?.brand,
            last4: pm.card?.last4,
            exp_month: pm.card?.exp_month,
            exp_year: pm.card?.exp_year,
            is_default: paymentMethods?.data?.length === 0
        }

        const exists = user?.paymentMethods.find(m => m?.id === card?.id);
        if (!exists) {
            user.paymentMethods.push(card);
            await user.save();
        }

        res.status(200).json({ message: "Payment method attached successfully", card });
    } catch (error) {
        console.error('Error attaching payment method:', error);
        res.status(500).json({ message: "Error attaching payment method", error: error.message });
    }
};

export const listMethods = async (req, res) => {
    try {

        const user = req?.registrationType === 'user' ? await Customer.findById(req?.user?._id) : await Driver.findById(req?.user?._id);
        if (!user) {
            return res.status(404).json({ message: "Customer not found" });
        }

        const stripeCustomerId = await ensureStripeCustomer(user);

        const paymentMethods = await stripe.paymentMethods.list({
            customer: stripeCustomerId,
            type: 'card',
        });

        res.status(200).json({ message: "Payment methods retrieved successfully", paymentMethods });
    } catch (error) {
        console.error('Error listing payment methods:', error);
        res.status(500).json({ message: "Error listing payment methods", error: error.message });
    }
};

export const setDefaultPaymentMethod = async (req, res) => {
    try {

        const { paymentMethodId } = req.body;

        const user = req?.registrationType === 'user' ? await Customer.findById(req?.user?._id) : await Driver.findById(req?.user?._id);
        if (!user) {
            return res.status(404).json({ message: "Customer not found" });
        }

        const stripeCustomerId = await ensureStripeCustomer(user);

        await stripe.customers.update(stripeCustomerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        user?.paymentMethods?.forEach(m => {
            if (m?.id === paymentMethodId) {
                m.is_default = true;
            } else {
                m.is_default = false;
            }
        });

        await user.save();

        res.status(200).json({ message: "Default payment method set successfully", defaultPaymentMethod: paymentMethodId });
    } catch (error) {
        console.error('Error setting default payment method:', error);
        res.status(500).json({ message: "Error setting default payment method", error: error.message });
    }
};

export const detachPaymentMethod = async (req, res) => {
    try {

        const { paymentMethodId } = req.body;

        const user = req?.registrationType === 'user' ? await Customer.findById(req?.user?._id) : await Driver.findById(req?.user?._id);
        if (!user) {
            return res.status(404).json({ message: "Customer not found" });
        }

        const stripeCustomerId = await ensureStripeCustomer(user);

        if (user?.paymentMethods?.length === 1) {
            return res.status(400).json({ message: "Cannot detach the last payment method" });
        }

        if (user?.paymentMethods?.find(m => m?.id === paymentMethodId)?.is_default) {
            return res.status(400).json({ message: "Cannot detach the default payment method" });
        }

        await stripe.paymentMethods.detach(paymentMethodId);

        user.paymentMethods = user.paymentMethods.filter(m => m?.id !== paymentMethodId);
        await user.save();

        res.status(200).json({ message: "Payment method detached successfully", paymentMethodId });
    } catch (error) {
        console.error('Error detaching payment method:', error);
        res.status(500).json({ message: "Error detaching payment method", error: error.message });
    }
};

export const createDriverSubscription = async (req, res) => {
    try {
        const { priceId, paymentMethodId } = req.body;

        // 1. Find driver
        const driver = await Driver.findById(req?.user?._id);
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        // 2. Ensure driver has Stripe customer
        const stripeCustomerId = await ensureStripeCustomer(driver);

        // 3. Attach payment method if not already attached
        await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });

        // 4. Set as default payment method
        await stripe.customers.update(stripeCustomerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        if (driver.paymentMethods.length === 0) {
            const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
            const card = {
                id: pm.id,
                brand: pm.card?.brand,
                last4: pm.card?.last4,
                exp_month: pm.card?.exp_month,
                exp_year: pm.card?.exp_year,
                is_default: true
            }

            driver.paymentMethods.push(card);
        }

        // 5. Create subscription
        const subscription = await stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [{ price: priceId }], // priceId from Stripe dashboard
            expand: ["latest_invoice.payment_intent"], // so we can confirm first payment
        });



        // Save subscription details in DB
        driver.subscription = {
            subscriptionId: subscription.id,
            status: subscription.status,
            priceId: priceId,
            subscriptionType: subscription.items.data[0].price.nickname.split(" ")[0],
            startDate: typeof subscription.start_date === 'number' ? new Date(subscription.start_date * 1000) : subscription.start_date,
            currentPeriodEnd: typeof subscription.current_period_end === 'number' ? new Date(subscription.current_period_end * 1000) : subscription.current_period_end,
        };

        await driver.save();

        res.status(200).json({
            message: "Subscription created successfully",
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret, // for mobile to confirm
        });
    } catch (error) {
        console.error("Error creating driver subscription:", error);
        res.status(500).json({ message: "Error creating driver subscription", error: error.message });
    }
};

export const cancelDriverSubscription = async (req, res) => {
    try {
        // 1. Find driver
        const driver = await Driver.findById(req?.user?._id);
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        if (!driver.subscription || !driver.subscription.subscriptionId) {
            return res.status(400).json({ message: "No active subscription found" });
        }

        // 2. Cancel subscription in Stripe
        await stripe.subscriptions.del(driver.subscription.subscriptionId);

        // 3. Remove subscription details from DB
        driver.subscription = {};
        await driver.save();

        res.status(200).json({ message: "Subscription cancelled successfully" });
    } catch (error) {
        console.error("Error cancelling driver subscription:", error);
        res.status(500).json({ message: "Error cancelling driver subscription", error: error.message });
    }
};

export const createRidePaymentIntent = async (req, res) => {
    try {
        const { amount, currency, paymentMethodId, driverStripeAccountId, rideId} = req.body;

        const customer = await Customer.findById(req?.user?._id);
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        const driver = await Driver.findOne({ stripeAccountId: driverStripeAccountId });
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        const stripeCustomerId = await ensureStripeCustomer(customer);
        const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);
        if (!stripeCustomer) {
            return res.status(404).json({ message: "Stripe customer not found" });
        }
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency,
            customer: stripeCustomerId,
            payment_method: paymentMethodId,
            off_session: true,
            confirm: true,
            payment_method_types: ['card'],
            transfer_data: {
                destination: driverStripeAccountId,
                amount: amount,
            },
        });

        const payment = new Payment({
            payer: customer._id,
            receiver: driver._id,
            amount: amount,
            paymentMethod: paymentMethodId,
            ride: rideId,
            paymentStatus: paymentIntent.status,
            paymentDate: new Date()
        });

        await payment.save();

        res.status(200).json({ message: "Payment intent created successfully", paymentIntent });

    } catch (error) {
        console.error("Error creating ride payment intent:", error);
        res.status(500).json({ message: "Error creating ride payment intent", error: error.message });
    }
}; 