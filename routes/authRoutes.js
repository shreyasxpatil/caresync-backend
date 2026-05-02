const express = require('express');
const router = express.Router();
const passport = require('passport');
const { register, login, googleCallback, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Local auth
router.post('/register', register);
router.post('/login', login);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', {
    // FIXED: /login route doesn't exist in React. Use /patient-login
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/patient-login?error=google_failed`,
    session: false
  }),
  googleCallback
);

// Protected
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;
