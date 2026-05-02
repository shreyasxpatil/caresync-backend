const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');

// @desc    Book an appointment
// @route   POST /api/patients/appointments
// @access  Private (Patient)
const bookAppointment = async (req, res) => {
  try {
    const { doctorId, appointmentDate, appointmentTime, reason, symptoms } = req.body;

    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    // Check for duplicate appointment
    const existing = await Appointment.findOne({
      patient: req.user._id,
      doctor: doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      status: { $nin: ['cancelled'] },
    });

    if (existing) {
      return res.status(400).json({
        message: 'You already have an appointment with this doctor at this time',
      });
    }

    const appointment = await Appointment.create({
      patient: req.user._id,
      doctor: doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      reason,
      symptoms,
    });

    await appointment.populate([
      { path: 'doctor', select: 'firstName lastName specialization consultationFee avatar' },
      { path: 'patient', select: 'firstName lastName email phone' },
    ]);

    res.status(201).json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get patient's appointments
// @route   GET /api/patients/appointments
// @access  Private (Patient)
const getPatientAppointments = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { patient: req.user._id };
    if (status) filter.status = status;

    const appointments = await Appointment.find(filter)
      .populate('doctor', 'firstName lastName specialization consultationFee avatar phone')
      .sort({ appointmentDate: -1 });

    res.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Cancel appointment
// @route   PUT /api/patients/appointments/:id/cancel
// @access  Private (Patient)
const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patient: req.user._id,
    });

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (appointment.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed appointment' });
    }

    appointment.status = 'cancelled';
    appointment.patientStatus = 'cancelled';
    appointment.cancelReason = req.body.cancelReason || 'Cancelled by patient';
    await appointment.save();

    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get patient's prescriptions
// @route   GET /api/patients/prescriptions
// @access  Private (Patient)
const getPatientPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patient: req.user._id })
      .populate('doctor', 'firstName lastName specialization avatar')
      .populate('appointment', 'appointmentDate appointmentTime')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: prescriptions.length, prescriptions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get patient medical history summary
// @route   GET /api/patients/history
// @access  Private (Patient)
const getMedicalHistory = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user._id })
      .populate('doctor', 'firstName lastName specialization')
      .sort({ createdAt: -1 });

    const prescriptions = await Prescription.find({ patient: req.user._id })
      .populate('doctor', 'firstName lastName specialization')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      history: {
        appointments,
        prescriptions,
        totalAppointments: appointments.length,
        totalPrescriptions: prescriptions.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  bookAppointment,
  getPatientAppointments,
  cancelAppointment,
  getPatientPrescriptions,
  getMedicalHistory,
};
