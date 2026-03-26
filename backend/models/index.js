const mongoose = require('mongoose');

// ── Teacher ───────────────────────────────────────────────────
const teacherSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true },
  phone:         { type: String, default: '' },
  dob:           { type: Date },
  gender:        { type: String, enum: ['Male', 'Female', 'Other'] },
  subject:       { type: String, required: true },
  qualification: { type: String, default: '' },
  experience:    { type: String, default: '' },
  salary:        { type: Number, default: 0 },
  status:        { type: String, enum: ['Active', 'On Leave', 'Inactive'], default: 'Active' },
  classes:       [{ type: String }],
  joinDate:      { type: Date, default: Date.now },
  photo:         { type: String, default: '' },
}, { timestamps: true });

// ── Class ─────────────────────────────────────────────────────
const classSchema = new mongoose.Schema({
  name:     { type: String, required: true, unique: true },
  grade:    { type: Number, required: true },
  section:  { type: String, required: true },
  teacher:  { type: String, default: '' },
  teacherId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  room:     { type: String, default: '' },
  capacity: { type: Number, default: 35 },
  students: { type: Number, default: 0 },
  schedule: { type: String, default: 'Mon-Fri 8:00-14:00' },
}, { timestamps: true });

// ── Exam ──────────────────────────────────────────────────────
const examSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  class:      { type: String, default: '' },
  subject:    { type: String, default: 'All Subjects' },
  date:       { type: Date, required: true },
  endDate:    { type: Date },
  totalMarks: { type: Number, default: 100 },
  passMarks:  { type: Number, default: 40 },
  status:     { type: String, enum: ['Scheduled', 'Upcoming', 'Completed', 'Cancelled'], default: 'Scheduled' },
  description:{ type: String, default: '' },
}, { timestamps: true });

// ── Fee ───────────────────────────────────────────────────────
const feeSchema = new mongoose.Schema({
  student:    { type: String, required: true },
  grade:      { type: String, default: '' },
  section:    { type: String, default: '' },
  strand:     { type: String, default: '' },
  studentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  class:      { type: String, default: '' },
  type:       { type: String, default: 'Tuition' },
  amount:     { type: Number, required: true },
  paid:       { type: Number, default: 0 },
  due:        { type: Number, default: 0 },
  dueDate:    { type: Date },
  date:       { type: Date, default: Date.now },
  status:     { type: String, enum: ['Paid', 'Partial', 'Pending', 'Overdue'], default: 'Pending' },
  notes:      { type: String, default: '' },
}, { timestamps: true });

// Auto-calculate due and status
feeSchema.pre('save', function(next) {
  this.due = this.amount - this.paid;
  if (this.due <= 0) this.status = 'Paid';
  else if (this.paid > 0) this.status = 'Partial';
  else if (this.dueDate && new Date() > this.dueDate) this.status = 'Overdue';
  else this.status = 'Pending';
  next();
});

// ── Event ─────────────────────────────────────────────────────
const eventSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  date:        { type: Date, required: true },
  time:        { type: String, default: '' },
  venue:       { type: String, default: '' },
  type:        { type: String, enum: ['Academic', 'Sports', 'Cultural', 'Meeting', 'Ceremony', 'Other'], default: 'Academic' },
  description: { type: String, default: '' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ── Announcement ──────────────────────────────────────────────
const announcementSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  message:  { type: String, required: true },
  author:   { type: String, default: 'Admin' },
  priority: { type: String, enum: ['High', 'Normal', 'Low'], default: 'Normal' },
  audience: { type: String, enum: ['All', 'Students', 'Teachers', 'Parents'], default: 'All' },
  createdBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = {
  Teacher:      mongoose.model('Teacher', teacherSchema),
  Class:        mongoose.model('Class', classSchema),
  Exam:         mongoose.model('Exam', examSchema),
  Fee:          mongoose.model('Fee', feeSchema),
  Event:        mongoose.model('Event', eventSchema),
  Announcement: mongoose.model('Announcement', announcementSchema),
};
