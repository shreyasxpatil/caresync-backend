const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, phone, gender } =
      req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create user with requested role (Patient, Doctor, or Admin)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || 'patient',
      phone,
      gender,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.isGoogleUser && !user.password) {
      return res.status(400).json({
        message: 'This account uses Google Sign-In. Please use Google login.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account deactivated. Contact admin.' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        specialization: user.specialization,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Google OAuth callback - generate JWT after passport auth
// @route   GET /api/auth/google/callback
// @access  Public (handled by passport)
const googleCallback = async (req, res) => {
  try {
    const token = generateToken(req.user._id);
    // Redirect to frontend with token
    res.redirect(
      `${process.env.CLIENT_URL}/auth/google/success?token=${token}&role=${req.user.role}`
    );
  } catch (error) {
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/patient-login?error=google_auth_failed`);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'gender', 'dateOfBirth',
      'address', 'bloodGroup', 'allergies', 'medicalHistory',
      'emergencyContact', 'specialization', 'qualifications',
      'experience', 'consultationFee', 'availableDays',
      'availableTimeStart', 'availableTimeEnd',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.body.password) {
      const user = await User.findById(req.user._id);
      user.password = req.body.password;
      await user.save();
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { register, login, googleCallback, getMe, updateProfile };
