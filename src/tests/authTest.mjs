import mongoose from 'mongoose';
import connectDB from '../database/index.mjs';
import { describe, it, before, after, beforeEach } from 'mocha';
import dotenv from 'dotenv';
import Driver from '../schemas/driverSchema.mjs';
import Customer from '../schemas/customerSchema.mjs';

dotenv.config();

describe('Auth Tests', function () {
    this.timeout(10000); // allow up to 10s for DB connections

    before(async function () {
        // ✅ await DB connection so Mocha waits
        await connectDB();
    });

    after(async function () {
        // ✅ drop test DB & disconnect cleanly
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });

    beforeEach(async function () {
        // ✅ clear collections before each test
        await Driver.deleteMany({});
        await Customer.deleteMany({});
    });

    // ---------- DRIVER SIGNUP TESTS ----------
    describe('Driver Signup', function () {
        it('should signup a driver with valid data', async function () {
            const driverData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phoneNumber: '1234567890',
                password: 'password123',
                licenseNumber: 'LIC123456',
                vehicleDetails: { make: 'Toyota', model: 'Camry', year: 2020, plateNumber: 'ABC123' }
            };
            const driver = await Driver.create(driverData);
            if (!driver) throw new Error('Driver not created');
            if (driver.email !== driverData.email) throw new Error('Email mismatch');
        });

        it('should fail signup with missing required fields', async function () {
            try {
                await Driver.create({ firstName: 'Jane' });
                throw new Error('Should not create driver');
            } catch (err) {
                if (!err) throw new Error('Expected error');
            }
        });

        it('should fail signup with duplicate email', async function () {
            const driverData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phoneNumber: '1234567890',
                password: 'password123',
                licenseNumber: 'LIC123456',
                vehicleDetails: { make: 'Toyota', model: 'Camry', year: 2020, plateNumber: 'ABC123' }
            };
            await Driver.create(driverData);
            try {
                await Driver.create({ ...driverData, phoneNumber: '0987654321', licenseNumber: 'LIC654321' });
                throw new Error('Should not create driver');
            } catch (err) {
                if (!err) throw new Error('Expected error');
            }
        });

        it('should fail signup with duplicate phoneNumber', async function () {
            const driverData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phoneNumber: '1234567890',
                password: 'password123',
                licenseNumber: 'LIC123456',
                vehicleDetails: { make: 'Toyota', model: 'Camry', year: 2020, plateNumber: 'ABC123' }
            };
            await Driver.create(driverData);
            try {
                await Driver.create({ ...driverData, email: 'jane@example.com', licenseNumber: 'LIC654321' });
                throw new Error('Should not create driver');
            } catch (err) {
                if (!err) throw new Error('Expected error');
            }
        });

        it('should fail signup with duplicate licenseNumber', async function () {
            const driverData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phoneNumber: '1234567890',
                password: 'password123',
                licenseNumber: 'LIC123456',
                vehicleDetails: { make: 'Toyota', model: 'Camry', year: 2020, plateNumber: 'ABC123' }
            };
            await Driver.create(driverData);
            try {
                await Driver.create({ ...driverData, email: 'jane@example.com', phoneNumber: '0987654321' });
                throw new Error('Should not create driver');
            } catch (err) {
                if (!err) throw new Error('Expected error');
            }
        });
    });

    // ---------- DRIVER LOGIN TESTS ----------
    describe('Driver Login', function () {
        it('should login with correct credentials and approved driver', async function () {
            const driverData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phoneNumber: '1234567890',
                password: 'password123',
                licenseNumber: 'LIC123456',
                isApproved: true,
                vehicleDetails: { make: 'Toyota', model: 'Camry', year: 2020, plateNumber: 'ABC123' }
            };
            await Driver.create(driverData);
            const driver = await Driver.findOne({ email: driverData.email, password: driverData.password, isApproved: true });
            if (!driver) throw new Error('Login failed');
        });

        it('should fail login with incorrect password', async function () {
            const driverData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phoneNumber: '1234567890',
                password: 'password123',
                licenseNumber: 'LIC123456',
                isApproved: true,
                vehicleDetails: { make: 'Toyota', model: 'Camry', year: 2020, plateNumber: 'ABC123' }
            };
            await Driver.create(driverData);
            const driver = await Driver.findOne({ email: driverData.email, password: 'wrongpassword', isApproved: true });
            if (driver) throw new Error('Login should fail');
        });

        it('should fail login if driver is not approved', async function () {
            const driverData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phoneNumber: '1234567890',
                password: 'password123',
                licenseNumber: 'LIC123456',
                isApproved: false,
                vehicleDetails: { make: 'Toyota', model: 'Camry', year: 2020, plateNumber: 'ABC123' }
            };
            await Driver.create(driverData);
            const driver = await Driver.findOne({ email: driverData.email, password: driverData.password, isApproved: true });
            if (driver) throw new Error('Login should fail');
        });
    });

    // ---------- CUSTOMER SIGNUP TESTS ----------
    describe('Customer Signup', function () {
        it('should signup a customer with valid data', async function () {
            const customerData = {
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@example.com',
                phoneNumber: '5551234567',
                password: 'mypassword',
                currentLocation: '123 Main St'
            };
            const customer = await Customer.create(customerData);
            if (!customer) throw new Error('Customer not created');
            if (customer.email !== customerData.email) throw new Error('Email mismatch');
        });

        it('should fail signup with missing required fields', async function () {
            try {
                await Customer.create({ firstName: 'Bob' });
                throw new Error('Should not create customer');
            } catch (err) {
                if (!err) throw new Error('Expected error');
            }
        });

        it('should fail signup with duplicate email', async function () {
            const customerData = {
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@example.com',
                phoneNumber: '5551234567',
                password: 'mypassword',
                currentLocation: '123 Main St'
            };
            await Customer.create(customerData);
            try {
                await Customer.create({ ...customerData, phoneNumber: '5557654321' });
                throw new Error('Should not create customer');
            } catch (err) {
                if (!err) throw new Error('Expected error');
            }
        });

        it('should fail signup with duplicate phoneNumber', async function () {
            const customerData = {
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@example.com',
                phoneNumber: '5551234567',
                password: 'mypassword',
                currentLocation: '123 Main St'
            };
            await Customer.create(customerData);
            try {
                await Customer.create({ ...customerData, email: 'bob@example.com' });
                throw new Error('Should not create customer');
            } catch (err) {
                if (!err) throw new Error('Expected error');
            }
        });
    });

    // ---------- CUSTOMER LOGIN TESTS ----------
    describe('Customer Login', function () {
        it('should login with correct credentials', async function () {
            const customerData = {
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@example.com',
                phoneNumber: '5551234567',
                password: 'mypassword',
                currentLocation: '123 Main St'
            };
            await Customer.create(customerData);
            const customer = await Customer.findOne({ email: customerData.email, password: customerData.password });
            if (!customer) throw new Error('Login failed');
        });

        it('should fail login with incorrect password', async function () {
            const customerData = {
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@example.com',
                phoneNumber: '5551234567',
                password: 'mypassword',
                currentLocation: '123 Main St'
            };
            await Customer.create(customerData);
            const customer = await Customer.findOne({ email: customerData.email, password: 'wrongpassword' });
            if (customer) throw new Error('Login should fail');
        });
    });
});
