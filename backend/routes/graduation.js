const express = require('express');
const Student = require('../models/Student');
const User    = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect, adminOnly);

// GET /api/graduation/preview
// Preview which Grade 12 students will be graduated
router.get('/preview', async (req, res) => {
  try {
    const grade12 = await Student.find({
      status: 'Active',
      $or: [
        { gradeLevel: 'Grade 12' },
        { grade: { $regex: '^12', $options: 'i' } },
      ],
    }).sort({ name: 1 });
    res.json({ students: grade12, count: grade12.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/graduation/run
// 1. Archive Grade 12 students → status: 'Graduated'
// 2. Delete their User accounts
// 3. Promote Grade 11 → Grade 12 (update grade fields)
// 4. Optionally wipe Grade 12 records entirely
router.post('/run', async (req, res) => {
  const { targetSchoolYear, deleteGraduated = false, promotionDate } = req.body;
  if (!targetSchoolYear)
    return res.status(400).json({ message: 'targetSchoolYear is required (e.g. 2026-2027)' });

  const log = { graduated: 0, promoted: 0, accountsDeleted: 0, studentsDeleted: 0, errors: [] };

  try {
    // ── Step 1: Graduate all Grade 12 students ───────────────
    const grade12 = await Student.find({
      status: 'Active',
      $or: [
        { gradeLevel: 'Grade 12' },
        { grade: { $regex: '^12', $options: 'i' } },
      ],
    });

    for (const s of grade12) {
      try {
        if (deleteGraduated) {
          // Delete student record entirely
          await User.deleteOne({ studentId: s._id });
          await Student.findByIdAndDelete(s._id);
          log.studentsDeleted++;
          log.accountsDeleted++;
        } else {
          // Archive: mark as Graduated
          await Student.findByIdAndUpdate(s._id, {
            status: 'Graduated',
            schoolYear: req.body.schoolYear || targetSchoolYear,
          });
          // Delete their login account (graduated students don't need portal access)
          const deleted = await User.deleteOne({ studentId: s._id });
          if (deleted.deletedCount) log.accountsDeleted++;
          log.graduated++;
        }
      } catch (e) { log.errors.push({ name: s.name, error: e.message }); }
    }

    // ── Step 2: Promote Grade 11 → Grade 12 ─────────────────
    const grade11 = await Student.find({
      status: 'Active',
      $or: [
        { gradeLevel: 'Grade 11' },
        { grade: { $regex: '^11', $options: 'i' } },
      ],
    });

    for (const s of grade11) {
      try {
        const newGrade    = (s.grade    || '').replace(/^11/, '12');
        const newSection  = (s.section  || '').replace(/^11/, '12');
        const newGradeLevel = 'Grade 12';
        await Student.findByIdAndUpdate(s._id, {
          grade:       newGrade || s.grade,
          section:     newSection || s.section,
          gradeLevel:  newGradeLevel,
          schoolYear:  targetSchoolYear,
          enrollmentType: 'Continuing',
        });
        log.promoted++;
      } catch (e) { log.errors.push({ name: s.name, error: e.message }); }
    }

    res.json({
      success: true,
      targetSchoolYear,
      ...log,
      message: `Graduation complete. ${log.graduated} graduated, ${log.promoted} promoted to Grade 12, ${log.accountsDeleted} accounts removed.`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message, log });
  }
});

module.exports = router;
