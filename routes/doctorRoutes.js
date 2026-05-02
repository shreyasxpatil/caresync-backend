const express = require('express');
const router = express.Router();
const {
  getDoctors, getDoctorById, getDoctorAppointments,
  updateAppointmentStatus, addPrescription, getDoctorPatients, getSpecializations,
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');

// Public
router.get('/', getDoctors);
router.get('/specializations', getSpecializations);
router.get('/:id', getDoctorById);

// Doctor-protected
router.get('/me/appointments', protect, authorize('doctor'), getDoctorAppointments);
router.put('/me/appointments/:id', protect, authorize('doctor'), updateAppointmentStatus);
router.post('/me/prescriptions', protect, authorize('doctor'), addPrescription);
router.get('/me/patients', protect, authorize('doctor'), getDoctorPatients);

module.exports = router;
