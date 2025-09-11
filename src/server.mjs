import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { initSocket } from './services/socketService.mjs';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import connectDB from './database/index.mjs';
import authRouter from './routes/authRoutes.mjs';
import adminRouter from './routes/adminRoutes.mjs';
import rideRouter from './routes/rideRoutes.mjs';
import paymentRouter from './routes/paymentRoutes.mjs';
import customerRouter from './routes/customerRoutes.mjs';
import chatRouter from './routes/chatRoutes.mjs';
import Driver from './schemas/driverSchema.mjs';
import Customer from './schemas/customerSchema.mjs';
import Ride from './schemas/rideSchema.mjs';


// Load environment variables
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);


initSocket(server);


// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://ec2-16-170-158-105.eu-north-1.compute.amazonaws.com', 'http://localhost:8000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token', 'x-refresh-token', 'x-csrf-token'],
    exposedHeaders: ['x-access-token', 'x-refresh-token', 'x-csrf-token'],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use(morgan('dev'));

connectDB();

// Serve static files from the public directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));



// Auth routes
app.use('/api/auth', authRouter);

// Customer routes
app.use('/api/customer', customerRouter);

// Ride routes
app.use('/api/rides', rideRouter);

// Chat routes
app.use('/api/chat', chatRouter);

// payment routes
app.use('/api/payment', paymentRouter);

// Admin routes
app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    console.log(req, "req");
    res.json({ status: 'ok' });
});

app.use(express.static(path.join(__dirname, "dist")));
app.get("/*path", (req, res) => {
    if (req.path.startsWith("/uploads/")) {
        return next(); // don't hijack uploads
    }
    res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});


const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});