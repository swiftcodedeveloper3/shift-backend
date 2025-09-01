import jwt from 'jsonwebtoken';
import Customer from '../schemas/customerSchema.mjs';
import Driver from '../schemas/driverSchema.mjs';
import Admin from '../schemas/adminSchema.mjs';

export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided.' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Invalid token format.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) return res.status(401).json({ message: 'Invalid token.' });
        // Check if the user exists in the database (optional, depending on your use case)
        const userType = decoded?.registrationType === 'driver' ? Driver : Customer;
        const user = await userType.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });
        // Optionally, you can check if the user is approved or active
        if (userType === Driver && !user.isApproved) {
            return res.status(403).json({ message: 'Driver not approved by admin.' });
        }
        if (userType === Customer && !user.isActive) {
            return res.status(403).json({ message: 'Customer account is inactive.' });
        }
        if (userType === Driver && !user.isActive) {
            return res.status(403).json({ message: 'Driver account is inactive.' });
        }
        if (!req.path === '/api/driver/goOffline' && userType === Driver && !user.isOnline) {
            return res.status(403).json({ message: 'Driver is currently offline.' });
        }
        // If everything is fine, proceed to the next middleware or route handler
        req.user = user; // Attach user information to the request object
        next();
    } catch (err) {
        console.error(err);
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

export const adminAuthenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided.' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Invalid token format.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }
        // Optionally, you can check if the admin exists in the database
        const admin = adminSchema.findById(decoded.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found.' });
        req.admin = admin; // Attach admin information to the request object
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
}