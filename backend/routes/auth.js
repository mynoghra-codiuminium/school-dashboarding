const express = require('express');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User    = require('../models/User');
const Student = require('../models/Student');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
const genToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).populate('studentId');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    if (!user.isActive)
      return res.status(403).json({ message: 'Account deactivated' });
    res.json({ user, token: genToken(user._id) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate('studentId');
  res.json(user);
});

// ── PUT /api/auth/profile ─────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (password) {
      user.password = password;
      user.mustChangePassword = false;
    }
    await user.save();
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PUT /api/auth/change-password ────────────────────────────
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword)))
      return res.status(401).json({ message: 'Current password is incorrect' });
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/auth/users (admin only) ─────────────────────────
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/auth/register (admin only) ─────────────────────
router.post('/register', protect, adminOnly, [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ errors: errs.array() });
  try {
    const { name, email, password, role, studentId } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password, role: role || 'staff', studentId: studentId || null });
    res.status(201).json({ user, token: genToken(user._id) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/auth/bulk-create-students (admin only) ─────────
// Creates User accounts for all enrolled students in batch
router.post('/bulk-create-students', protect, adminOnly, async (req, res) => {
  try {
    const students = await Student.find({ status: 'Active' });
    let created = 0, skipped = 0, errors = [];

    for (const s of students) {
      try {
        const email = s.email;
        const exists = await User.findOne({ email });
        if (exists) { skipped++; continue; }
        // Default password = LRN or first 6 chars of name (no spaces) + 123
        const defaultPw = s.lrn
          ? s.lrn.slice(-6)
          : s.name.replace(/\s+/g, '').slice(0, 6).toLowerCase() + '123';
        await User.create({
          name: s.name,
          email,
          password: defaultPw,
          role: 'student',
          studentId: s._id,
          mustChangePassword: true,
        });
        created++;
      } catch (e) {
        errors.push({ name: s.name, error: e.message });
      }
    }
    res.json({ created, skipped, errors, total: students.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE /api/auth/users/:id (admin only) ───────────────────
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ message: 'Cannot delete your own account' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PUT /api/auth/users/:id (admin only) ─────────────────────
router.put('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (name) user.name = name;
    if (email) user.email = email;
    if (role)  user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    await user.save();
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
