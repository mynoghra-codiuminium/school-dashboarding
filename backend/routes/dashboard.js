const express = require('express');
const Student = require('../models/Student');
const { Teacher, Class, Exam, Fee, Event, Announcement } = require('../models/index');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/stats', async (req, res) => {
  try {
    const [
      totalStudents, activeStudents,
      totalTeachers, activeTeachers,
      totalClasses,
      totalExams, upcomingExams,
      fees,
      upcomingEvents,
      recentAnnouncements,
      recentStudents,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'Active' }),
      Teacher.countDocuments(),
      Teacher.countDocuments({ status: 'Active' }),
      Class.countDocuments(),
      Exam.countDocuments(),
      Exam.countDocuments({ status: { $in: ['Scheduled', 'Upcoming'] } }),
      Fee.find(),
      Event.find({ date: { $gte: new Date() } }).sort({ date: 1 }).limit(5),
      Announcement.find().sort({ createdAt: -1 }).limit(4),
      Student.find().sort({ createdAt: -1 }).limit(6),
    ]);

    const totalFeeAmount   = fees.reduce((a, f) => a + f.amount, 0);
    const totalFeePaid     = fees.reduce((a, f) => a + f.paid, 0);
    const totalFeeDue      = fees.reduce((a, f) => a + f.due, 0);
    const overdueCount     = fees.filter(f => f.status === 'Overdue').length;

    const students = await Student.find({ status: 'Active' });
    const avgAttendance = students.length
      ? Math.round(students.reduce((a, s) => a + s.attendance, 0) / students.length)
      : 0;
    const avgGPA = students.length
      ? (students.reduce((a, s) => a + s.gpa, 0) / students.length).toFixed(2)
      : 0;

    res.json({
      students:  { total: totalStudents, active: activeStudents },
      teachers:  { total: totalTeachers, active: activeTeachers },
      classes:   { total: totalClasses },
      exams:     { total: totalExams, upcoming: upcomingExams },
      fees:      { total: totalFeeAmount, collected: totalFeePaid, due: totalFeeDue, overdue: overdueCount },
      academics: { avgAttendance, avgGPA },
      upcomingEvents,
      recentAnnouncements,
      recentStudents,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
