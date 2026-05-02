const express = require('express');
const router = express.Router();
const {
  bookAppointment, getPatientAppointments, cancelAppointment,
  getPatientPrescriptions, getMedicalHistory,
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('patient'));

router.post('/appointments', bookAppointment);
router.get('/appointments', getPatientAppointments);
router.put('/appointments/:id/cancel', cancelAppointment);
router.get('/prescriptions', getPatientPrescriptions);
router.get('/history', getMedicalHistory);

module.exports = router;
