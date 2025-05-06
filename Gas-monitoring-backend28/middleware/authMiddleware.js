const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
 
module.exports = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        // Check if token exists
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization denied, no token provided' });
        }
        // Extract token from Bearer format
        const token = authHeader.split(' ')[1];
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Add user from payload to request
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        res.status(401).json({ message: 'Invalid token' });
    }
};