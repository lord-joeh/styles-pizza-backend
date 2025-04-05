// pizza-app-backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { query } = require('../config/db'); // Assuming you have your database query function here
const { handleError } = require('../services/errorService');

// Middleware to authenticate the user using a Bearer token
exports.authenticate = async (req, res, next) => {
    // Extract token from Authorization header and remove "Bearer " prefix
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return handleError(res, 401, 'Authentication required: No token provided.');
    }

    try {
        // Verify the token with the JWT secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Retrieve the user from the database using the decoded token ID
        const userResult = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);

        if (!userResult.rows || userResult.rows.length === 0 || !userResult.rows[0]) {
            return handleError(res, 401, 'Authentication failed: User not found or invalid token.');
        }

        // Attach user info to the request object for further use
        req.user = userResult.rows[0];
        console.log("Req.user (authenticated): ", req.user); // Debugging log
        next();
    } catch (error) {
        // If any error occurs during verification or user retrieval, respond with an invalid token error
        console.error("Authentication Error:", error); // Log the error for debugging
        if (error instanceof jwt.JsonWebTokenError) {
            return handleError(res, 401, 'Authentication failed: Invalid JWT.');
        } else {
            return handleError(res, 401, 'Authentication failed: Token verification or user retrieval error.');
        }
    }
};

// Middleware to authorize access based on user roles
exports.authorize = (...roles) => (req, res, next) => {
    if (!req.user) {
        // This should never happen if authenticate is used correctly.
        console.error("Authorization Error: req.user is undefined.");
        return handleError(res, 401, 'Authorization failed: No user authenticated.');
    }

    if (!req.user.role) {
        console.error("Authorization Error: req.user.role is undefined.");
        return handleError(res, 500, 'Internal server error: User role not found.');
    }

    if (!roles.includes(req.user.role)) {
        return handleError(res, 403, 'Authorization failed: Unauthorized access.');
    }

    next();
};

//Middleware to check if req.user exists.
exports.ensureUser = (req, res, next) => {
    if (!req.user) {
        return handleError(res, 401, "Unauthorized, no user found");
    }
    next();
}