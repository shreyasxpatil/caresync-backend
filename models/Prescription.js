const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    diagnosis: { type: String, required: true },
    disease: { type: String },
    allergy: { type: String },
    prescription: { type: String, required: true },
    medicines: [
      {
        name: String,
        dosage: String,
        frequency: String,
        duration: String,
      },
    ],
    notes: { type: String },
    followUpDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);
