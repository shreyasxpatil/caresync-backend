const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getAllUsers, createDoctor, updateUser, deleteUser,
  getAllAppointments, updateAppointment, getMessages, markMessageRead,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.post('/doctors', createDoctor);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/appointments', getAllAppointments);
router.put('/appointments/:id', updateAppointment);
router.get('/messages', getMessages);
router.put('/messages/:id/read', markMessageRead);

module.exports = router;
