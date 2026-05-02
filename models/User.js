const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, minlength: 5 },
    googleId: { type: String },
    avatar: { type: String },
    isGoogleUser: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ['admin', 'doctor', 'patient'],
      default: 'patient',
    },
    isActive: { type: Boolean, default: true },
    phone: { type: String },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    dateOfBirth: { type: Date },
    address: { type: String },
    // Doctor-specific fields (populated when role = 'doctor')
    specialization: { type: String },
    qualifications: { type: String },
    experience: { type: Number },
    consultationFee: { type: Number },
    availableDays: [{ type: String }],
    availableTimeStart: { type: String },
    availableTimeEnd: { type: String },
    // Patient-specific fields
    bloodGroup: { type: String },
    allergies: { type: String },
    medicalHistory: { type: String },
    emergencyContact: { type: String },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Full name virtual
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);
