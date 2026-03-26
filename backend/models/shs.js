const mongoose = require('mongoose');

// ── STRAND MODEL ──────────────────────────────────────────────
const strandSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true },  // e.g. STEM
  fullName:    { type: String, required: true },                // e.g. Science, Technology, Engineering & Mathematics
  track:       { type: String, enum: ['Academic','TVL','Sports','Arts & Design'], default: 'Academic' },
  description: { type: String, default: '' },
  subjects:    [{ type: String }],
  color:       { type: String, default: '#2563eb' },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

// ── SUBJECT MODEL ─────────────────────────────────────────────
const subjectSchema = new mongoose.Schema({
  code:        { type: String, required: true },               // e.g. STEM_GEN_BIO
  name:        { type: String, required: true },               // e.g. General Biology 1
  strand:      { type: String, required: true },               // STEM / ABM / HUMSS etc.
  gradeLevel:  { type: String, enum: ['Grade 11','Grade 12'], required: true },
  semester:    { type: String, enum: ['1st Semester','2nd Semester'], required: true },
  type:        { type: String, enum: ['Core','Applied','Specialized'], default: 'Core' },
  units:       { type: Number, default: 3 },
  teacher:     { type: String, default: '' },
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
}, { timestamps: true });

// ── ENROLLMENT MODEL ──────────────────────────────────────────
const enrollmentSchema = new mongoose.Schema({
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  studentName:  { type: String, required: true },
  lrn:          { type: String, default: '' },                 // Learner Reference Number
  strand:       { type: String, required: true },
  gradeLevel:   { type: String, enum: ['Grade 11','Grade 12'], required: true },
  semester:     { type: String, enum: ['1st Semester','2nd Semester'], required: true },
  schoolYear:   { type: String, required: true },              // e.g. 2024-2025
  section:      { type: String, default: '' },
  enrollmentType: { type: String, enum: ['New','Returnee','Transferee','Continuing'], default: 'New' },
  status:       { type: String, enum: ['Enrolled','Dropped','Transferred','Graduated'], default: 'Enrolled' },
  documents: {
    birthCertificate: { type: Boolean, default: false },
    form137:          { type: Boolean, default: false },
    goodMoral:        { type: Boolean, default: false },
    reportCard:       { type: Boolean, default: false },
    idPictures:       { type: Boolean, default: false },
  },
  voucher: {
    hasVoucher:   { type: Boolean, default: false },
    voucherType:  { type: String, enum: ['ESC','SHS','None'], default: 'None' },
    voucherAmount: { type: Number, default: 0 },
    voucherNo:    { type: String, default: '' },
  },
  enrolledBy: { type: String, default: '' },
  enrollDate: { type: Date, default: Date.now },
}, { timestamps: true });

// ── GRADES MODEL (DepEd Formula) ──────────────────────────────
const gradeSchema = new mongoose.Schema({
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  studentName: { type: String, required: true },
  strand:      { type: String, required: true },
  gradeLevel:  { type: String, required: true },
  semester:    { type: String, required: true },
  schoolYear:  { type: String, required: true },
  subjectCode: { type: String, required: true },
  subjectName: { type: String, required: true },
  teacher:     { type: String, default: '' },
  quarter:     { type: String, enum: ['Q1','Q2','Q3','Q4'], required: true },
  // DepEd Components: WW=25%, PT=50%, QA=25%
  writtenWorks:  {
    scores:  [{ title: String, score: Number, total: Number }],
    percent: { type: Number, default: 0 },   // computed 0–100
    weight:  { type: Number, default: 25 },
  },
  performanceTasks: {
    scores:  [{ title: String, score: Number, total: Number }],
    percent: { type: Number, default: 0 },
    weight:  { type: Number, default: 50 },
  },
  quarterlyAssessment: {
    score:   { type: Number, default: 0 },
    total:   { type: Number, default: 100 },
    percent: { type: Number, default: 0 },
    weight:  { type: Number, default: 25 },
  },
  initialGrade:   { type: Number, default: 0 },  // WW+PT+QA weighted
  transmutedGrade:{ type: Number, default: 0 },  // after transmutation table
  remarks:        { type: String, enum: ['Passed','Failed','Incomplete','Dropped'], default: 'Passed' },
}, { timestamps: true });

// ── REPORT CARD MODEL ─────────────────────────────────────────
const reportCardSchema = new mongoose.Schema({
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  studentName: { type: String, required: true },
  strand:      { type: String, required: true },
  gradeLevel:  { type: String, required: true },
  semester:    { type: String, required: true },
  schoolYear:  { type: String, required: true },
  section:     { type: String, default: '' },
  subjects: [{
    code:            String,
    name:            String,
    q1Grade:         Number,
    q2Grade:         Number,
    finalGrade:      Number,
    remarks:         String,
  }],
  gwa:         { type: Number, default: 0 },  // General Weighted Average
  generalAverage: { type: Number, default: 0 },
  honors:      { type: String, enum: ['With Highest Honors','With Honors','None'], default: 'None' },
  promoted:    { type: Boolean, default: true },
  adviser:     { type: String, default: '' },
  principal:   { type: String, default: '' },
  dateIssued:  { type: Date, default: Date.now },
  status:      { type: String, enum: ['Draft','Released'], default: 'Draft' },
}, { timestamps: true });

// ── CLEARANCE MODEL ───────────────────────────────────────────
const clearanceSchema = new mongoose.Schema({
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  studentName: { type: String, required: true },
  strand:      { type: String, required: true },
  gradeLevel:  { type: String, required: true },
  schoolYear:  { type: String, required: true },
  semester:    { type: String, required: true },
  departments: {
    library:    { cleared: { type: Boolean, default: false }, clearedBy: String, date: Date, remarks: String },
    finance:    { cleared: { type: Boolean, default: false }, clearedBy: String, date: Date, remarks: String },
    guidance:   { cleared: { type: Boolean, default: false }, clearedBy: String, date: Date, remarks: String },
    registrar:  { cleared: { type: Boolean, default: false }, clearedBy: String, date: Date, remarks: String },
    laboratory: { cleared: { type: Boolean, default: false }, clearedBy: String, date: Date, remarks: String },
    clinic:     { cleared: { type: Boolean, default: false }, clearedBy: String, date: Date, remarks: String },
    pe:         { cleared: { type: Boolean, default: false }, clearedBy: String, date: Date, remarks: String },
    studentAffairs: { cleared: { type: Boolean, default: false }, clearedBy: String, date: Date, remarks: String },
  },
  overallStatus: { type: String, enum: ['Pending','Partial','Cleared'], default: 'Pending' },
}, { timestamps: true });

// ── WORK IMMERSION MODEL ──────────────────────────────────────
const immersionSchema = new mongoose.Schema({
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  studentName:  { type: String, required: true },
  strand:       { type: String, required: true },
  gradeLevel:   { type: String, required: true },
  schoolYear:   { type: String, required: true },
  company:      { type: String, required: true },
  address:      { type: String, default: '' },
  supervisor:   { type: String, default: '' },
  supervisorContact: { type: String, default: '' },
  startDate:    { type: Date },
  endDate:      { type: Date },
  requiredHours:{ type: Number, default: 80 },
  renderedHours:{ type: Number, default: 0 },
  status:       { type: String, enum: ['Ongoing','Completed','Incomplete','Withdrawn'], default: 'Ongoing' },
  moaStatus:    { type: String, enum: ['Pending','Signed','Expired'], default: 'Pending' },
  finalGrade:   { type: Number, default: 0 },
  remarks:      { type: String, default: '' },
  logs: [{
    date:  Date,
    hours: Number,
    task:  String,
  }],
}, { timestamps: true });

// ── BEHAVIOR/INCIDENT MODEL ───────────────────────────────────
const incidentSchema = new mongoose.Schema({
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  studentName: { type: String, required: true },
  strand:      { type: String, required: true },
  gradeLevel:  { type: String, required: true },
  date:        { type: Date, required: true },
  type:        { type: String, enum: ['Commendation','Minor Offense','Major Offense','Observation'], required: true },
  category:    { type: String, default: '' },
  description: { type: String, required: true },
  actionTaken: { type: String, default: '' },
  reportedBy:  { type: String, default: '' },
  status:      { type: String, enum: ['Open','Resolved','Escalated'], default: 'Open' },
  parentNotified: { type: Boolean, default: false },
  followUpDate: { type: Date },
}, { timestamps: true });

module.exports = {
  Strand:     mongoose.model('Strand',     strandSchema),
  Subject:    mongoose.model('Subject',    subjectSchema),
  Enrollment: mongoose.model('Enrollment', enrollmentSchema),
  Grade:      mongoose.model('Grade',      gradeSchema),
  ReportCard: mongoose.model('ReportCard', reportCardSchema),
  Clearance:  mongoose.model('Clearance',  clearanceSchema),
  Immersion:  mongoose.model('Immersion',  immersionSchema),
  Incident:   mongoose.model('Incident',   incidentSchema),
};
