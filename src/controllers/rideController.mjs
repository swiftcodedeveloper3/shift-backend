import Driver from '../schemas/driverSchema.mjs';
import Customer from '../schemas/customerSchema.mjs';
import Ride from '../schemas/rideSchema.mjs';
import redisClient from '../config/redisClient.mjs';
import { fareCalculator } from '../utils/fareCalculator.mjs';
import { notifyRideRequested, notifyRideAccepted, notifyDriverArrived, notifyRideStarted, notifyRideCompleted, notifyRideCancelled, sendCollectItemsReminder } from '../services/socketService.mjs';

export const requestRide = async (req, res) => {
    try {
        const { pickupLocation, dropoffLocation, rideType, passengers, distance, duration, fare } = req.body;
        const customerId = req.user._id; // Assuming user is authenticated and customerId is available

        // Validate required fields
        if (!pickupLocation || !dropoffLocation || !rideType) {
            return res.status(400).json({ message: 'All fields are required.' });
        }


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
            timestamps: {
                requestedAt: new Date()
            },
            distance,
            duration,
            status: 'requested'
        });

        // Calculate fare (assuming fareCalculator is a utility function)
        // ride.fare = await fareCalculator(pickupLocation, dropoffLocation, rideType);
        // Save the ride request
        await ride.save();

        await ride.populate('customer'); // Populate customer details

        await redisClient.set(`ride_status:${ride._id}`, 'pending');

        // Notify drivers about the new ride request
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