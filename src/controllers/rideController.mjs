import Driver from '../schemas/driverSchema.mjs';
import Customer from '../schemas/customerSchema.mjs';
import Ride from '../schemas/rideSchema.mjs';
console.log("🚨 Ride enum at runtime:", Ride.schema.path('rideType').enumValues);
import redisClient from '../config/redisClient.mjs';
import { RIDE_TYPES } from "../config/rideTypes.mjs";
import { fareCalculator } from '../utils/fareCalculator.mjs';
import { notifyRideRequested, notifyRideAccepted, notifyDriverArrived, notifyRideStarted, notifyRideCompleted, notifyRideCancelled, sendCollectItemsReminder } from '../services/socketService.mjs';

export const requestRide = async (req, res) => {
    try {
        const { pickupLocation, dropoffLocation, rideType, passengers, distance, duration, amountStr, currency } = req.body;
        const customerId = req.user._id; // Assuming user is authenticated and customerId is available

        // Validate required fields
        if (!pickupLocation || !dropoffLocation || !rideType) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const rideConfig = RIDE_TYPES[rideType];
        if (!rideConfig) {
            return res.status(400).json({ message: "Invalid ride type" });
        }
        if (
            typeof rideConfig.seats === "number" &&
            passengers > rideConfig.seats
            ) {
            return res.status(400).json({
                message: `Selected ${rideType} supports max ${rideConfig.seats} passengers`
            });
        }

        const currencyDecimals = {
            // 0 decimal places
            BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0,
            KMF: 0, KRW: 0, PYG: 0, RWF: 0, UGX: 0, VND: 0,
            VUV: 0, XAF: 0, XOF: 0, XPF: 0,
            // 3 decimal places
            BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3,
            // 2 decimal places (default for most currencies)
            AED: 2, AFN: 2, ALL: 2, AMD: 2, ANG: 2, ARS: 2, AUD: 2, AWG: 2,
            AZN: 2, BAM: 2, BBD: 2, BDT: 2, BGN: 2, BMD: 2, BND: 2, BOB: 2,
            BRL: 2, BSD: 2, BTN: 2, BZD: 2, CAD: 2, CHF: 2, CNY: 2, COP: 2,
            CRC: 2, CVE: 2, CZK: 2, DKK: 2, DOP: 2, DZD: 2, EUR: 2, FJD: 2,
            GBP: 2, GIP: 2, GTQ: 2, GYD: 2, HNL: 2, HRK: 2, HTG: 2, HUF: 2,
            IDR: 2, ILS: 2, INR: 2, IS: 2, JMD: 2, KES: 2, KGS: 2, KHR: 2,
            KMF: 0, KPW: 2, KYD: 2, LAK: 2, LBP: 2, LKR: 2, LRD: 2, LSL: 2,
            MAD: 2, MDL: 2, MGA: 2, MKD: 2, MMK: 2, MNT: 2, MOP: 2, MRU: 2,
            MUR: 2, MVR: 2, MWK: 2, MXN: 2, MYR: 2, MZN: 2, NAD: 2, NGN: 2,
            NIO: 2, NOK: 2, NPR: 2, NZD: 2, OMR: 3, PAB: 2, PEN: 2, PGK: 2,
            PHP: 2, PKR: 2, PLN: 2, PYG: 0, QAR: 2, RON: 2, RSD: 2, RUB: 2,
            RWF: 0, SAR: 2, SCR: 2, SEK: 2, SGD: 2, SLL: 2, SOS: 2, SSP: 2,
            STN: 2, SVC: 2, SYP: 2, THB: 2, TJS: 2, TMT: 2, TOP: 2, TRY: 2,
            TTD: 2, TTD: 2, TWD: 2, TZS: 2, UAH: 2, UGX: 0, USD: 2, UYU: 2,
            UZS: 2, VES: 2, VND: 0, WST: 2, XAF: 0, XCD: 2, XOF: 0, XPF: 0,
            YER: 2, ZAR: 2, ZMW: 2, ZWL: 2,
            // you can keep going for all Stripe‐supported currencies
        };

        function getDecimals(currency) {
            currency = currency?.toUpperCase();
            if (!currency) throw new Error('Currency is required');
            if (currencyDecimals.hasOwnProperty(currency)) {
                return currencyDecimals[currency];
            }
            // fallback: assume 2 decimals
            return 2;
        }

        /**
         * Convert a user-entered amount string ("12.34", "12", "0.1") to integer minor units.
         * - amountStr: string (use string to avoid float problems)
         * - currency: ISO 4217 currency code, e.g. "USD", "JPY"
         * Returns integer number (Number or BigInt) that you can send to Stripe.
         */
        function amountToMinorUnits() {
            // ensure string, remove commas etc
            if (typeof amountStr !== 'string') amountStr = String(amountStr);
            let cleaned = amountStr.replace(/,/g, '').trim();
            if (!cleaned) throw new Error('Invalid amount');
            // allow integer or decimal
            const match = cleaned.match(/^(\d+)(\.(\d*))?$/);
            if (!match) throw new Error('Invalid numeric format');
            const whole = match[1];
            const fractionPart = match[3] ?? '';
            const decimals = getDecimals(currency);

            let fraction = fractionPart;
            if (fraction.length > decimals) {
                // you can choose to round instead of truncate, here I'm truncating
                fraction = fraction.substring(0, decimals);
            }
            // pad right with zeros if needed
            while (fraction.length < decimals) {
                fraction += '0';
            }

            const minorStr = whole + fraction;
            // remove leading zeros
            const minorClean = minorStr.replace(/^0+(?=\d)|^$/, '0');

            // convert to integer
            const minorInt = parseInt(minorClean, 10);
            if (isNaN(minorInt)) throw new Error('Conversion failed');
            return minorInt;
        }

        const fare = amountToMinorUnits();

        // Create a new ride request
        const ride = new Ride({
            customer: customerId,
            pickupLocation: {
                coordinates: pickupLocation?.coordinates?.reverse(),
                address: pickupLocation?.address
            },
            dropoffLocation: {
                coordinates: dropoffLocation?.coordinates?.reverse(),
                address: dropoffLocation?.address
            },
            rideType,
            passengers: passengers || 1, // Default to 1 passenger if not provided
            fare,
            amount: amountStr,
            timestamps: {
                requestedAt: new Date()
            },
            distance,
            duration,
            status: 'requested'
        });

        
        // Calculate fare (assuming fareCalculator is a utility function)
        ride.fare = await fareCalculator(pickupLocation, dropoffLocation, rideType);
        // Save the ride request
        await ride.save();

        await ride.populate('customer'); // Populate customer details

        await redisClient.set(`ride_status:${ride._id}`, 'pending');

        // // Notify drivers about the new ride request
        notifyRideRequested(ride);

        res.status(201).json({ message: 'Ride request created successfully.', ride });
    } catch (err) {
        console.error('Error requesting ride:', err);
        res.status(500).json({ message: 'Failed to request ride.', error: err.message });
    }
}

export const acceptRequest = async (req, res) => {
    try {
        const { rideId } = req.body;
        const driverId = req.user._id; // Assuming user is authenticated and driverId is available

        // Find the ride request
        const ride = await Ride.findById(rideId);
        if (!ride) return res.status(404).json({ message: 'Ride request not found.' });

        // Check if the ride is already accepted or completed
        if (ride.status !== 'requested') {
            return res.status(400).json({ message: 'Ride request cannot be accepted.' });
        }

        // Update the ride status and assign the driver
        ride.status = 'accepted';
        ride.driver = driverId;
        ride.timestamps.acceptedAt = new Date(); // Set the accepted timestamp
        ride.driver = await Driver.findOne({ _id: driverId, status: 'available' }); // Ensure driver is not already in a ride
        if (!ride.driver) return res.status(404).json({ message: 'Driver not found.' });
        await ride.save();

        // Update driver's status to on ride
        const driver = await Driver.findById(driverId);
        if (driver) {
            driver.status = 'on_ride'; // Set driver status to on ride
            await driver.save();
        }

        // Notify the customer about the accepted ride
        notifyRideAccepted(ride);

        res.status(200).json({ message: 'Ride request accepted successfully.', ride });
    } catch (err) {
        console.error('Error accepting ride request:', err);
        res.status(500).json({ message: 'Failed to accept ride request.', error: err.message });
    }
}

export const driverArrived = async (req, res) => {
    try {
        const { rideId } = req.body;
        const driverId = req.user._id; // Assuming user is authenticated and driverId is available

        // Find the ride request
        const ride = await Ride.findById(rideId);
        if (!ride) return res.status(404).json({ message: 'Ride request not found.' });

        // Check if the ride is accepted
        if (ride.status !== 'accepted') {
            return res.status(400).json({ message: 'Ride request must be accepted before arriving.' });
        }

        // Update the ride status to driver arrived
        ride.status = 'driver_arrived';
        ride.timestamps.arrivedAt = new Date(); // Set the arrived timestamp
        await ride.save();

        // Notify the customer about the driver's arrival
        notifyDriverArrived(ride);

        res.status(200).json({ message: 'Driver has arrived at the pickup location.', ride });
    } catch (err) {
        console.error('Error marking driver as arrived:', err);
        res.status(500).json({ message: 'Failed to mark driver as arrived.', error: err.message });
    }
};

export const byPassWaitingTime = async (req, res) => {
    try {
        const { rideId } = req.body;
        const driverId = req.user._id; // Assuming user is authenticated and driverId is available

        // Find the ride request
        const ride = await Ride.findById(rideId);
        if (!ride) return res.status(404).json({ message: 'Ride request not found.' });

        // Check if the ride is in the correct state to bypass waiting time
        if (ride.status !== 'waiting') {
            return res.status(400).json({ message: 'Ride cannot be bypassed at this stage.' });
        }

        // Update the ride status to in progress
        ride.status = 'ride_started';
        ride.timestamps.startedAt = new Date(); // Set the started timestamp
        await ride.save();

        res.status(200).json({ message: 'Ride has started successfully.', ride });
    } catch (err) {
        console.error('Error bypassing waiting time:', err);
        res.status(500).json({ message: 'Failed to bypass waiting time.', error: err.message });
    }
};

export const startRide = async (req, res) => {
    try {
        const { rideId } = req.body;
        const driverId = req.user._id; // Assuming user is authenticated and driverId is available

        // Find the ride request
        const ride = await Ride.findById(rideId);
        if (!ride) return res.status(404).json({ message: 'Ride request not found.' });

        // Check if the ride is in the correct state to start
        if (ride.status !== 'driver_arrived') {
            return res.status(400).json({ message: 'Ride cannot be started at this stage.' });
        }

        // if (ride.timestamps.arrivedAt) {
        //     const currentTime = new Date();
        //     const arrivedTime = new Date(ride.timestamps.arrivedAt);
        //     const timeDifference = (currentTime - arrivedTime) / 1000; // in seconds

        //     if (timeDifference > 300) { // 5 minutes
        //         return res.status(400).json({ message: 'Ride cannot be started after 5 minutes of arrival.' });
        //     }
        // }

        // Update the ride status to in progress
        ride.status = 'ride_started';
        ride.timestamps.startedAt = new Date(); // Set the started timestamp
        await ride.save();

        // Notify the customer about the ride start
        notifyRideStarted(ride);

        res.status(200).json({ message: 'Ride has started successfully.', ride });
    } catch (err) {
        console.error('Error starting ride:', err);
        res.status(500).json({ message: 'Failed to start ride.', error: err.message });
    }
};

export const completeRide = async (req, res) => {
    try {
        const { rideId } = req.body;
        const driverId = req.user._id; // Assuming user is authenticated and driverId is available

        // Find the ride request
        const ride = await Ride.findById(rideId);
        if (!ride) return res.status(404).json({ message: 'Ride request not found.' });

        // Check if the ride is in progress
        if (ride.status !== 'ride_started') {
            return res.status(400).json({ message: 'Ride cannot be completed at this stage.' });
        }

        // send collect items reminder
        sendCollectItemsReminder(ride.customer,
            `Please collect all your belongings before leaving the vehicle. We are not responsible for lost or forgotten items.`);

        // Update the ride status to completed
        ride.status = 'completed';
        ride.timestamps.completedAt = new Date(); // Set the completed timestamp
        await ride.save();

        // Update driver's status to available
        const driver = await Driver.findById(driverId);
        if (driver) {
            driver.status = "available"; // Set driver status to online
            driver.lastRide = rideId;
            driver.currentLocation = ride.dropoffLocation;
            await driver.save();
        }

        // Notify the customer about the ride completion
        notifyRideCompleted(ride);

        // Update customer's ride history
        const customer = await Customer.findById(ride.customer);
        if (customer) {
            customer.rideHistory.push(rideId);
            await customer.save();
        }

        res.status(200).json({ message: 'Ride has been completed successfully.', ride });
    } catch (err) {
        console.error('Error completing ride:', err);
        res.status(500).json({ message: 'Failed to complete ride.', error: err.message });
    }
}

export const cancelRide = async (req, res) => {
    try {
        const { rideId } = req.body;
        const userId = req.user._id; // Assuming user is authenticated and userId is available

        // Find the ride request
        const ride = await Ride.findById(rideId);
        if (!ride) return res.status(404).json({ message: 'Ride request not found.' });

        // Check if the ride can be cancelled
        if (ride.status === 'completed' || ride.status === 'cancelled_by_customer' || ride.status === 'cancelled_by_driver') {
            return res.status(400).json({ message: 'Ride cannot be cancelled at this stage.' });
        }

        // send collect items reminder
        sendCollectItemsReminder(ride.customer,
            `Please collect all your belongings before leaving the vehicle. We are not responsible for lost or forgotten items.`);

        // Update the ride status to cancelled
        ride.status = userId.equals(ride.customer) ? 'cancelled_by_customer' : 'cancelled_by_driver';
        ride.cancelledAt = new Date(); // Set the cancelled timestamp
        await ride.save();

        // If the ride was cancelled by the driver, update driver's status to available
        if (ride.status === 'cancelled_by_driver') {
            const driver = await Driver.findById(ride.driver);
            if (driver) {
                driver.status = 'available'; // Set driver status to available
                await driver.save();
            }
        } else {
            // Notify the driver about the cancellation
            const driver = await Driver.findById(ride.driver);
            if (driver) {
                driver.status = 'available'; // Set driver status to available
                await driver.save();
            }
        }

        // Notify the customer and driver about the ride cancellation
        notifyRideCancelled(ride);

        // Update customer's ride history
        const customer = await Customer.findById(ride.customer);
        if (customer) {
            customer.rideHistory.push(rideId);
            await customer.save();
        }

        res.status(200).json({ message: 'Ride has been cancelled successfully.', ride });
    } catch (err) {
        console.error('Error cancelling ride:', err);
        res.status(500).json({ message: 'Failed to cancel ride.', error: err.message });
    }
}