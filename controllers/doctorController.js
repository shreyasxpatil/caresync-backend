const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Public
const getDoctors = async (req, res) => {
  try {
    const { specialization, name } = req.query;
    const filter = { role: 'doctor', isActive: true };

    if (specialization) filter.specialization = new RegExp(specialization, 'i');
    if (name) {
      filter.$or = [
        { firstName: new RegExp(name, 'i') },
        { lastName: new RegExp(name, 'i') },
      ];
    }

    const doctors = await User.find(filter).select(
      '-password -googleId -medicalHistory -allergies -bloodGroup'
    );

    res.json({ success: true, count: doctors.length, doctors });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
const getDoctorById = async (req, res) => {
  try {
    const doctor = await User.findOne({
      _id: req.params.id,
      role: 'doctor',
    }).select('-password -googleId');

    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ success: true, doctor });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get doctor's appointments
// @route   GET /api/doctors/appointments
// @access  Private (Doctor)
const getDoctorAppointments = async (req, res) => {
  try {
    const { status, date } = req.query;
    const filter = { doctor: req.user._id };

    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      filter.appointmentDate = {
        $gte: new Date(d.setHours(0, 0, 0, 0)),
        $lt: new Date(d.setHours(23, 59, 59, 999)),
      };
    }

    const appointments = await Appointment.find(filter)
      .populate('patient', 'firstName lastName email phone gender bloodGroup avatar')
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    res.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update appointment status by doctor
// @route   PUT /api/doctors/appointments/:id
// @access  Private (Doctor)
const updateAppointmentStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctor: req.user._id,
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.doctorStatus = status;
    appointment.status = status;
    if (notes) appointment.notes = notes;
    await appointment.save();

    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add prescription
// @route   POST /api/doctors/prescriptions
// @access  Private (Doctor)
const addPrescription = async (req, res) => {
  try {
    const {
      patientId, appointmentId, diagnosis, disease,
      allergy, prescription, medicines, notes, followUpDate,
    } = req.body;

    const patientExists = await User.findOne({ _id: patientId, role: 'patient' });
    if (!patientExists) return res.status(404).json({ message: 'Patient not found' });

    const newPrescription = await Prescription.create({
      patient: patientId,
      doctor: req.user._id,
      appointment: appointmentId,
      diagnosis,
      disease,
      allergy,
      prescription,
      medicines: medicines || [],
      notes,
      followUpDate,
    });

    // Mark appointment as completed
    if (appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, {
        status: 'completed',
        doctorStatus: 'completed',
      });
    }

    await newPrescription.populate([
      { path: 'patient', select: 'firstName lastName email' },
      { path: 'doctor', select: 'firstName lastName specialization' },
    ]);

    res.status(201).json({ success: true, prescription: newPrescription });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get doctor's patients list
// @route   GET /api/doctors/patients
// @access  Private (Doctor)
const getDoctorPatients = async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctor: req.user._id }).distinct('patient');
    const patients = await User.find({ _id: { $in: appointments } }).select(
      '-password -googleId'
    );
    res.json({ success: true, count: patients.length, patients });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get specializations list
// @route   GET /api/doctors/specializations
// @access  Public
const getSpecializations = async (req, res) => {
  try {
    const specializations = await User.distinct('specialization', {
      role: 'doctor',
      isActive: true,
      specialization: { $exists: true, $ne: null },
    });
    res.json({ success: true, specializations });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getDoctors,
  getDoctorById,
  getDoctorAppointments,
  updateAppointmentStatus,
  addPrescription,
  getDoctorPatients,
  getSpecializations,
};
