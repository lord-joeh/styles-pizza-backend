const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyEmail,
  loginUser,
  refreshToken,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  deleteUser,
  logoutUser,
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validateRegistration } = require('../middleware/validationMiddleware');
const {loginLimiter} = require('../middleware/rateLimiter')


// Public routes
router.post('/register', validateRegistration, registerUser);
router.get('/verify-email', verifyEmail);
router.post('/login',loginLimiter, loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes (requires authentication)
router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/logout', logoutUser);
router.get('/token/refresh', refreshToken);

// Admin-only routes
router.use(authorize('admin'));

router.delete('/:id', deleteUser);

module.exports = router;
