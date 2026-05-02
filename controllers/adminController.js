const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Contact = require('../models/Contact');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalPatients, totalDoctors, totalAppointments,
      pendingAppointments, completedAppointments, cancelledAppointments,
      totalPrescriptions, totalMessages, recentAppointments,
    ] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'doctor' }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'pending' }),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'cancelled' }),
      Prescription.countDocuments(),
      Contact.countDocuments({ isRead: false }),
      Appointment.find()
        .populate('patient', 'firstName lastName email')
        .populate('doctor', 'firstName lastName specialization')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    res.json({
      success: true,
      stats: {
        totalPatients, totalDoctors, totalAppointments,
        pendingAppointments, completedAppointments, cancelledAppointments,
        totalPrescriptions, unreadMessages: totalMessages,
      },
      recentAppointments,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all users (filtered by role)
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    const skip = (page - 1) * limit;
    const users = await User.find(filter)
      .select('-password -googleId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create doctor account
// @route   POST /api/admin/doctors
// @access  Private (Admin)
const createDoctor = async (req, res) => {
  try {
    const {
      firstName, lastName, email, password, phone, gender,
      specialization, qualifications, experience, consultationFee,
      availableDays, availableTimeStart, availableTimeEnd,
    } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const doctor = await User.create({
      firstName, lastName, email, password, phone, gender,
      role: 'doctor', specialization, qualifications, experience,
      consultationFee, availableDays, availableTimeStart, availableTimeEnd,
    });

    res.status(201).json({
      success: true,
      doctor: { ...doctor.toObject(), password: undefined },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update any user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
const updateUser = async (req, res) => {
  try {
    const forbiddenFields = ['password', 'googleId', '_id'];
    forbiddenFields.forEach((f) => delete req.body[f]);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-password -googleId');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete / deactivate user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin' });

    user.isActive = false;
    await user.save();
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all appointments
// @route   GET /api/admin/appointments
// @access  Private (Admin)
const getAllAppointments = async (req, res) => {
  try {
    const { status, doctorId, patientId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (doctorId) filter.doctor = doctorId;
    if (patientId) filter.patient = patientId;

    const skip = (page - 1) * limit;
    const appointments = await Appointment.find(filter)
      .populate('patient', 'firstName lastName email phone gender')
      .populate('doctor', 'firstName lastName specialization')
      .sort({ appointmentDate: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Appointment.countDocuments(filter);

    res.json({
      success: true,
      appointments,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Admin update appointment status
// @route   PUT /api/admin/appointments/:id
// @access  Private (Admin)
const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    )
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName specialization');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get contact messages
// @route   GET /api/admin/messages
// @access  Private (Admin)
const getMessages = async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, count: messages.length, messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mark message as read
// @route   PUT /api/admin/messages/:id/read
// @access  Private (Admin)
const markMessageRead = async (req, res) => {
  try {
    const msg = await Contact.findByIdAndUpdate(
      req.params.id,
      { isRead: true, repliedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, message: msg });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  createDoctor,
  updateUser,
  deleteUser,
  getAllAppointments,
  updateAppointment,
  getMessages,
  markMessageRead,
};
