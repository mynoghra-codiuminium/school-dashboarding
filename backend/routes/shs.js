const express = require('express');
const { protect } = require('../middleware/auth');
const {
  Strand, Subject, Enrollment, Grade,
  ReportCard, Clearance, Immersion, Incident
} = require('../models/shs');

// ── TRANSMUTATION TABLE (DepEd) ───────────────────────────────
function transmute(initial) {
  const table = [
    [100,100],[98.40,99],[96.80,98],[95.20,97],[93.60,96],[92.00,95],
    [90.40,94],[88.80,93],[87.20,92],[85.60,91],[84.00,90],[82.40,89],
    [80.80,88],[79.20,87],[77.60,86],[76.00,85],[74.40,84],[72.80,83],
    [71.20,82],[69.60,81],[68.00,80],[66.40,79],[64.80,78],[63.20,77],
    [61.60,76],[60.00,75],[56.00,74],[52.00,73],[48.00,72],[44.00,71],[40.00,70],
  ];
  for (const [raw, trans] of table) {
    if (initial >= raw) return trans;
  }
  return 70;
}

function computeGrade(gradeDoc) {
  const ww = gradeDoc.writtenWorks?.percent || 0;
  const pt = gradeDoc.performanceTasks?.percent || 0;
  const qa = gradeDoc.quarterlyAssessment?.percent || 0;
  const initial = (ww * 0.25) + (pt * 0.50) + (qa * 0.25);
  const transmuted = transmute(initial);
  return { initial: Math.round(initial * 100) / 100, transmuted };
}

// ─────────────────────────────────────────────────────────────
// STRAND ROUTES
// ─────────────────────────────────────────────────────────────
const strandRouter = express.Router();
strandRouter.use(protect);

strandRouter.get('/', async (req, res) => {
  try { res.json(await Strand.find().sort({ name: 1 })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
strandRouter.post('/', async (req, res) => {
  try { res.status(201).json(await Strand.create(req.body)); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
strandRouter.put('/:id', async (req, res) => {
  try { res.json(await Strand.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
strandRouter.delete('/:id', async (req, res) => {
  try { await Strand.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// SUBJECT ROUTES
// ─────────────────────────────────────────────────────────────
const subjectRouter = express.Router();
subjectRouter.use(protect);

subjectRouter.get('/', async (req, res) => {
  try {
    const { strand, gradeLevel, semester } = req.query;
    const q = {};
    if (strand) q.strand = strand;
    if (gradeLevel) q.gradeLevel = gradeLevel;
    if (semester) q.semester = semester;
    res.json(await Subject.find(q).sort({ strand: 1, name: 1 }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});
subjectRouter.post('/', async (req, res) => {
  try { res.status(201).json(await Subject.create(req.body)); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
subjectRouter.put('/:id', async (req, res) => {
  try { res.json(await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
subjectRouter.delete('/:id', async (req, res) => {
  try { await Subject.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// ENROLLMENT ROUTES
// ─────────────────────────────────────────────────────────────
const enrollmentRouter = express.Router();
enrollmentRouter.use(protect);

enrollmentRouter.get('/', async (req, res) => {
  try {
    const { search, strand, gradeLevel, schoolYear, status } = req.query;
    const q = {};
    if (search) q.studentName = { $regex: search, $options: 'i' };
    if (strand && strand !== 'All') q.strand = strand;
    if (gradeLevel && gradeLevel !== 'All') q.gradeLevel = gradeLevel;
    if (schoolYear) q.schoolYear = schoolYear;
    if (status && status !== 'All') q.status = status;
    const data = await Enrollment.find(q).sort({ createdAt: -1 });
    res.json(data);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
enrollmentRouter.post('/', async (req, res) => {
  try { res.status(201).json(await Enrollment.create(req.body)); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
enrollmentRouter.put('/:id', async (req, res) => {
  try { res.json(await Enrollment.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

enrollmentRouter.post('/batch', async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'No records provided' });
    }
    const results = { success: 0, failed: 0, errors: [] };
    for (const record of records) {
      try {
        await Enrollment.create(record);
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push({ student: record.studentName, error: e.message });
      }
    }
    res.status(201).json(results);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
enrollmentRouter.delete('/:id', async (req, res) => {
  try { await Enrollment.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// GRADES ROUTES
// ─────────────────────────────────────────────────────────────
const gradeRouter = express.Router();
gradeRouter.use(protect);

gradeRouter.get('/', async (req, res) => {
  try {
    const { studentId, strand, gradeLevel, semester, schoolYear, quarter } = req.query;
    const q = {};
    if (studentId) q.studentId = studentId;
    if (strand) q.strand = strand;
    if (gradeLevel) q.gradeLevel = gradeLevel;
    if (semester) q.semester = semester;
    if (schoolYear) q.schoolYear = schoolYear;
    if (quarter) q.quarter = quarter;
    res.json(await Grade.find(q).sort({ studentName: 1, subjectName: 1 }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

gradeRouter.post('/', async (req, res) => {
  try {
    const { initial, transmuted } = computeGrade(req.body);
    const grade = await Grade.create({
      ...req.body,
      initialGrade: initial,
      transmutedGrade: transmuted,
      remarks: transmuted >= 75 ? 'Passed' : 'Failed',
    });
    res.status(201).json(grade);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

gradeRouter.put('/:id', async (req, res) => {
  try {
    const { initial, transmuted } = computeGrade(req.body);
    const grade = await Grade.findByIdAndUpdate(req.params.id, {
      ...req.body,
      initialGrade: initial,
      transmutedGrade: transmuted,
      remarks: transmuted >= 75 ? 'Passed' : 'Failed',
    }, { new: true });
    res.json(grade);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

gradeRouter.delete('/:id', async (req, res) => {
  try { await Grade.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});


// POST /api/shs/grades/batch — bulk upsert grades
gradeRouter.post('/batch', async (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : req.body.grades || [];
  if (!rows.length) return res.status(400).json({ message: 'No data provided' });
  let saved = 0, errors = [];
  for (const row of rows) {
    try {
      const { initial, transmuted } = computeGrade(row);
      const filter = {
        studentId: row.studentId || null,
        studentName: row.studentName,
        subjectCode: row.subjectCode,
        quarter: row.quarter,
        semester: row.semester,
        schoolYear: row.schoolYear,
      };
      await Grade.findOneAndUpdate(filter, {
        ...row, initialGrade: initial, transmutedGrade: transmuted,
        remarks: transmuted >= 75 ? 'Passed' : 'Failed',
      }, { upsert: true, new: true });
      saved++;
    } catch (e) { errors.push({ name: row.studentName||'?', error: e.message }); }
  }
  res.json({ saved, errors, total: rows.length });
});

// ─────────────────────────────────────────────────────────────
// REPORT CARD ROUTES
// ─────────────────────────────────────────────────────────────
const reportCardRouter = express.Router();
reportCardRouter.use(protect);

reportCardRouter.get('/', async (req, res) => {
  try {
    const { search, strand, gradeLevel, schoolYear } = req.query;
    const q = {};
    if (search) q.studentName = { $regex: search, $options: 'i' };
    if (strand && strand !== 'All') q.strand = strand;
    if (gradeLevel && gradeLevel !== 'All') q.gradeLevel = gradeLevel;
    if (schoolYear) q.schoolYear = schoolYear;
    res.json(await ReportCard.find(q).sort({ studentName: 1 }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

reportCardRouter.post('/generate', async (req, res) => {
  try {
    const { studentId, studentName, strand, gradeLevel, semester, schoolYear, section, adviser, principal } = req.body;
    const grades = await Grade.find({ studentId, semester, schoolYear });
    const subjectMap = {};
    grades.forEach(g => {
      if (!subjectMap[g.subjectCode]) subjectMap[g.subjectCode] = { code: g.subjectCode, name: g.subjectName, grades: {} };
      subjectMap[g.subjectCode].grades[g.quarter] = g.transmutedGrade;
    });
    const subjects = Object.values(subjectMap).map(s => {
      const q1 = s.grades['Q1'] || 0, q2 = s.grades['Q2'] || 0;
      const q3 = s.grades['Q3'] || 0, q4 = s.grades['Q4'] || 0;
      const filled = [q1,q2,q3,q4].filter(v=>v>0);
      const finalGrade = filled.length ? Math.round(filled.reduce((a,b)=>a+b,0)/filled.length) : 0;
      return { code: s.code, name: s.name, q1Grade: q1, q2Grade: q2, finalGrade, remarks: finalGrade >= 75 ? 'Passed' : 'Failed' };
    });
    const validGrades = subjects.filter(s=>s.finalGrade>0);
    const gwa = validGrades.length ? Math.round(validGrades.reduce((a,s)=>a+s.finalGrade,0)/validGrades.length*100)/100 : 0;
    const honors = gwa >= 98 ? 'With Highest Honors' : gwa >= 90 ? 'With Honors' : 'None';
    const rc = await ReportCard.create({ studentId, studentName, strand, gradeLevel, semester, schoolYear, section, subjects, gwa, generalAverage: gwa, honors, promoted: gwa >= 75, adviser, principal, status: 'Draft' });
    res.status(201).json(rc);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

reportCardRouter.put('/:id', async (req, res) => {
  try { res.json(await ReportCard.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
reportCardRouter.delete('/:id', async (req, res) => {
  try { await ReportCard.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// CLEARANCE ROUTES
// ─────────────────────────────────────────────────────────────
const clearanceRouter = express.Router();
clearanceRouter.use(protect);

clearanceRouter.get('/', async (req, res) => {
  try {
    const { search, strand, schoolYear, status } = req.query;
    const q = {};
    if (search) q.studentName = { $regex: search, $options: 'i' };
    if (strand && strand !== 'All') q.strand = strand;
    if (schoolYear) q.schoolYear = schoolYear;
    if (status && status !== 'All') q.overallStatus = status;
    res.json(await Clearance.find(q).sort({ studentName: 1 }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});
clearanceRouter.post('/', async (req, res) => {
  try { res.status(201).json(await Clearance.create(req.body)); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
clearanceRouter.put('/:id', async (req, res) => {
  try {
    const body = req.body;
    // Auto-compute overall status
    if (body.departments) {
      const depts = Object.values(body.departments);
      const cleared = depts.filter(d=>d.cleared).length;
      body.overallStatus = cleared === depts.length ? 'Cleared' : cleared > 0 ? 'Partial' : 'Pending';
    }
    res.json(await Clearance.findByIdAndUpdate(req.params.id, body, { new: true }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});
clearanceRouter.delete('/:id', async (req, res) => {
  try { await Clearance.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// WORK IMMERSION ROUTES
// ─────────────────────────────────────────────────────────────

// POST /api/shs/clearances/batch — bulk approve departments for multiple students
clearanceRouter.post('/batch', async (req, res) => {
  // body: { studentIds: [], department: 'library', cleared: true, clearedBy: 'Teacher Name', remarks: '' }
  const { studentIds, department, cleared, clearedBy, remarks } = req.body;
  if (!studentIds?.length || !department)
    return res.status(400).json({ message: 'studentIds and department required' });
  let updated = 0, errors = [];
  for (const sid of studentIds) {
    try {
      const update = {};
      update[`departments.${department}.cleared`]   = cleared !== false;
      update[`departments.${department}.clearedBy`] = clearedBy || '';
      update[`departments.${department}.date`]       = new Date();
      update[`departments.${department}.remarks`]    = remarks || '';
      const result = await Clearance.findOneAndUpdate(
        { studentId: sid },
        { $set: update },
        { new: true, upsert: false }
      );
      if (result) updated++;
      else errors.push({ id: sid, error: 'No clearance record found — create record first' });
    } catch (e) { errors.push({ id: sid, error: e.message }); }
  }
  res.json({ updated, errors, total: studentIds.length });
});

const immersionRouter = express.Router();
immersionRouter.use(protect);

immersionRouter.get('/', async (req, res) => {
  try {
    const { search, strand, status, schoolYear } = req.query;
    const q = {};
    if (search) q.studentName = { $regex: search, $options: 'i' };
    if (strand && strand !== 'All') q.strand = strand;
    if (status && status !== 'All') q.status = status;
    if (schoolYear) q.schoolYear = schoolYear;
    res.json(await Immersion.find(q).sort({ studentName: 1 }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});
immersionRouter.post('/', async (req, res) => {
  try { res.status(201).json(await Immersion.create(req.body)); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
immersionRouter.put('/:id', async (req, res) => {
  try {
    const body = req.body;
    if (body.renderedHours >= body.requiredHours) body.status = 'Completed';
    res.json(await Immersion.findByIdAndUpdate(req.params.id, body, { new: true }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});
immersionRouter.post('/:id/log', async (req, res) => {
  try {
    const im = await Immersion.findById(req.params.id);
    im.logs.push(req.body);
    im.renderedHours = im.logs.reduce((a, l) => a + (l.hours || 0), 0);
    if (im.renderedHours >= im.requiredHours) im.status = 'Completed';
    await im.save();
    res.json(im);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
immersionRouter.delete('/:id', async (req, res) => {
  try { await Immersion.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// INCIDENT / BEHAVIOR ROUTES
// ─────────────────────────────────────────────────────────────
const incidentRouter = express.Router();
incidentRouter.use(protect);

incidentRouter.get('/', async (req, res) => {
  try {
    const { search, type, status, strand } = req.query;
    const q = {};
    if (search) q.studentName = { $regex: search, $options: 'i' };
    if (type && type !== 'All') q.type = type;
    if (status && status !== 'All') q.status = status;
    if (strand && strand !== 'All') q.strand = strand;
    res.json(await Incident.find(q).sort({ date: -1 }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});
incidentRouter.post('/', async (req, res) => {
  try { res.status(201).json(await Incident.create(req.body)); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
incidentRouter.put('/:id', async (req, res) => {
  try { res.json(await Incident.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
incidentRouter.delete('/:id', async (req, res) => {
  try { await Incident.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ message: e.message }); }
});

// ─────────────────────────────────────────────────────────────
// SHS DASHBOARD STATS
// ─────────────────────────────────────────────────────────────
const shsDashRouter = express.Router();
shsDashRouter.use(protect);

shsDashRouter.get('/stats', async (req, res) => {
  try {
    const sy = req.query.schoolYear || '2024-2025';
    const [
      totalEnrolled, byStrand, totalGrades,
      clearancePending, clearanceCleared,
      immersionOngoing, immersionCompleted,
      incidents,
    ] = await Promise.all([
      Enrollment.countDocuments({ schoolYear: sy, status: 'Enrolled' }),
      Enrollment.aggregate([{ $match: { schoolYear: sy, status: 'Enrolled' } }, { $group: { _id: '$strand', count: { $sum: 1 } } }]),
      Grade.countDocuments({ schoolYear: sy }),
      Clearance.countDocuments({ schoolYear: sy, overallStatus: { $ne: 'Cleared' } }),
      Clearance.countDocuments({ schoolYear: sy, overallStatus: 'Cleared' }),
      Immersion.countDocuments({ schoolYear: sy, status: 'Ongoing' }),
      Immersion.countDocuments({ schoolYear: sy, status: 'Completed' }),
      Incident.countDocuments({ type: { $in: ['Minor Offense','Major Offense'] }, status: 'Open' }),
    ]);
    res.json({ totalEnrolled, byStrand, totalGrades, clearancePending, clearanceCleared, immersionOngoing, immersionCompleted, openIncidents: incidents });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = { strandRouter, subjectRouter, enrollmentRouter, gradeRouter, reportCardRouter, clearanceRouter, immersionRouter, incidentRouter, shsDashRouter };
