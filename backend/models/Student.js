const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  email:          { type: String, required: true, unique: true, lowercase: true },
  phone:          { type: String, default: '' },
  dob:            { type: Date },
  gender:         { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
  address:        { type: String, default: '' },
  grade:          { type: String, required: true },
  gradeLevel:     { type: String, default: '' },
  section:        { type: String, default: '' },
  strand:         { type: String, default: '' },
  lrn:            { type: String, default: '' },
  status:         { type: String, enum: ['Active', 'Inactive', 'Transferred'], default: 'Active' },
  gpa:            { type: Number, default: 0, min: 0, max: 4 },
  attendance:     { type: Number, default: 0, min: 0, max: 100 },
  enrollDate:     { type: Date, default: Date.now },
  parent:         { type: String, default: '' },
  parentPhone:    { type: String, default: '' },
  fees:           { type: String, enum: ['Paid', 'Pending', 'Overdue', 'Partial'], default: 'Pending' },
  photo:          { type: String, default: '' },
  enrollmentType: { type: String, enum: ['New', 'Returnee', 'Transferee', 'Continuing'], default: 'New' },
  semester:       { type: String, default: '' },
  schoolYear:     { type: String, default: '' },
  voucher: {
    hasVoucher:    { type: Boolean, default: false },
    voucherType:   { type: String, enum: ['ESC', 'SHS', 'None'], default: 'None' },
    voucherAmount: { type: Number, default: 0 },
    voucherNo:     { type: String, default: '' },
  },
  documents: {
    birthCertificate: { type: Boolean, default: false },
    form137:          { type: Boolean, default: false },
    goodMoral:        { type: Boolean, default: false },
    reportCard:       { type: Boolean, default: false },
    idPictures:       { type: Boolean, default: false },
  },
}, { timestamps: true });

studentSchema.index({ name: 'text', email: 'text', grade: 'text' });

module.exports = mongoose.model('Student', studentSchema);
