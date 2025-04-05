const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query, connect } = require('../config/db');
const { handleError } = require('../services/errorService');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('../services/emailService');

// Register new user
exports.registerUser = async (req, res) => {
  const client = await connect();
  try {
    await client.query('BEGIN');
    const { name, email, password, phone, role = 'customer' } = req.body;

    // Validate input
    if (!name || !email || !password || !phone) {
      return handleError(
        res,
        400,
        'name, email, phone, and password are required',
      );
    }

    // Check existing user
    const existingUser = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
    if (existingUser.rows.length > 0) {
      return handleError(res, 409, 'Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_VERIFICATION_EXPIRATION || '1h',
    });

    // Create user
    const newUser = await client.query(
      `INSERT INTO users 
       (name, email, password, phone, role, verification_token) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, email, phone, role, created_at`,
      [name, email, hashedPassword, phone, role, verificationToken],
    );

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message:
        'Registration successful. Please check your email to verify your account.',
      user: newUser.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    handleError(res, 500, 'Registration failed', error);
  } finally {
    client.release();
  }
};

// Verify user email
exports.verifyEmail = async (req, res) => {
  const client = await connect();
  try {
    const { token } = req.query;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await client.query(
      `UPDATE users 
       SET is_verified = TRUE, verification_token = NULL 
       WHERE email = $1 AND verification_token = $2 
       RETURNING id, email`,
      [decoded.email, token],
    );

    if (result.rows.length === 0) {
      return handleError(res, 400, 'Invalid or expired verification token');
    }

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    handleError(res, 400, 'Invalid or expired verification token');
  } finally {
    client.release();
  }
};

// User login
exports.loginUser = async (req, res) => {
  const client = await connect();
  try {
    const { email, password } = req.body;

    const user = await client.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);

    if (user.rows.length === 0) {
      return handleError(res, 401, 'Invalid credentials');
    }

    const dbUser = user.rows[0];

    // Check email verification
    if (!dbUser.is_verified) {
      return handleError(
        res,
        403,
        'Please verify your email before logging in',
      );
    }

    // Validate password
    const validPassword = await bcrypt.compare(password, dbUser.password);
    if (!validPassword) {
      return handleError(res, 401, 'Invalid credentials');
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: dbUser.id, role: dbUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '15m' },
    );

    const resetToken = jwt.sign(
      { id: dbUser.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d' },
    );

    // Store refresh token
    await client.query('UPDATE users SET reset_token = $1 WHERE id = $2', [
      resetToken,
      dbUser.id,
    ]);

    // Set refresh token in cookie
    res.cookie('resetToken', resetToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      accessToken,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
      },
    });
  } catch (error) {
    handleError(res, 500, 'Login failed', error);
  } finally {
    client.release();
  }
};

// Refresh access token
exports.refreshToken = async (req, res) => {
  const client = await connect();
  try {
    const resetToken = req.cookies.resetToken;
    if (!resetToken) return handleError(res, 401, 'Refresh token required');

    const decoded = jwt.verify(resetToken, process.env.JWT_REFRESH_SECRET);

    const user = await client.query(
      'SELECT * FROM users WHERE id = $1 AND reset_token = $2',
      [decoded.id, resetToken],
    );

    if (user.rows.length === 0) {
      return handleError(res, 403, 'Invalid refresh token');
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '15m' },
    );

    res.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    handleError(res, 403, 'Invalid refresh token');
  } finally {
    client.release();
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  const client = await connect();
  try {
    const { email } = req.body;

    const user = await client.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);

    if (user.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If the email exists, a reset link will be sent',
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_RESET_EXPIRATION || '15m' },
    );

    // Store reset token
    await client.query('UPDATE users SET reset_token = $1 WHERE id = $2', [
      resetToken,
      user.rows[0].id,
    ]);

    // Send password reset email
    await sendPasswordResetEmail(email, resetToken);

    res.json({
      success: true,
      message: 'Password reset link sent to email',
    });
  } catch (error) {
    handleError(res, 500, 'Password reset failed', error);
  } finally {
    client.release();
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  const client = await connect();
  try {
    const { token, newPassword } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await client.query(
      'SELECT * FROM users WHERE id = $1 AND reset_token = $2',
      [decoded.id, token],
    );

    if (user.rows.length === 0) {
      return handleError(res, 400, 'Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await client.query(
      'UPDATE users SET password = $1, reset_token = NULL WHERE id = $2',
      [hashedPassword, decoded.id],
    );

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    handleError(res, 400, 'Invalid or expired reset token');
  } finally {
    client.release();
  }
};

// Get user profile
// userController.js
exports.getProfile = async (req, res) => {
  // console.log('getProfile called for user:', req.user);
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized, no user found' });
  }
  try {
    const userId = req.user.id;
    // console.log('Fetching user with ID:', userId);
    const user = await query('SELECT * FROM users WHERE id = $1', [userId]);
    // console.log('Database result: ', user);

    if (!user.rows[0]) {
      return handleError(res, 404, 'User not found');
    }

    res.json({ success: true, user: user.rows[0] });
  } catch (error) {
    console.error('getProfile error: ', error);
    handleError(res, 500, 'Failed to retrieve profile', error);
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  const client = await connect();
  try {
    const { name, phone } = req.body;
    const userId = req.user.id;

    const updatedUser = await client.query(
      `UPDATE users 
       SET name = $1, phone = $2 
       WHERE id = $3 
       RETURNING id, name, email, phone, role`,
      [name, phone, userId],
    );

    res.json({
      success: true,
      user: updatedUser.rows[0],
    });
  } catch (error) {
    handleError(res, 500, 'Failed to update profile', error);
  } finally {
    client.release();
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  const client = await connect();
  try {
    const userId = req.params.id;

    const result = await client.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [userId],
    );

    if (result.rows.length === 0) {
      return handleError(res, 404, 'User not found');
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    handleError(res, 500, 'Failed to delete user', error);
  } finally {
    client.release();
  }
};

// Logout user
exports.logoutUser = async (req, res) => {
  const client = await connect();
  try {
    const userId = req.user.id;

    // Clear refresh token (change column name from refresh_token to reset_token)
    await client.query('UPDATE users SET reset_token = NULL WHERE id = $1', [
      userId,
    ]);

    // Clear cookie
    res.clearCookie('resetToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    handleError(res, 500, 'Logout failed', error);
  } finally {
    client.release();
  }
};
