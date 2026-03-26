// ── routes/teachers.js ────────────────────────────────────────
const express = require('express');
const { Teacher } = require('../models/index');
const { protect } = require('../middleware/auth');
const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const query = search ? { $or: [{ name: { $regex: search, $options: 'i' } }, { subject: { $regex: search, $options: 'i' } }] } : {};
    const teachers = await Teacher.find(query).sort({ createdAt: -1 });
    res.json(teachers);
  } catch (err) { res.status(500).json({ message: err.message }); }
});
router.get('/:id', async (req, res) => {
  try {
    const t = await Teacher.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Not found' });
    res.json(t);
  } catch (err) { res.status(500).json({ message: err.message }); }
});
router.post('/', async (req, res) => {
  try {
    const t = await Teacher.create(req.body);
    res.status(201).json(t);
  } catch (err) { res.status(500).json({ message: err.message }); }
});
router.put('/:id', async (req, res) => {
  try {
    const t = await Teacher.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!t) return res.status(404).json({ message: 'Not found' });
    res.json(t);
  } catch (err) { res.status(500).json({ message: err.message }); }
});
router.delete('/:id', async (req, res) => {
  try {
    await Teacher.findByIdAndDelete(req.params.id);
    res.json({ message: 'Teacher deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
module.exports = router;

// POST /api/teachers/batch — bulk import teachers from array
router.post('/batch', async (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : req.body.teachers || [];
  if (!rows.length) return res.status(400).json({ message: 'No data provided' });
  let created = 0, skipped = 0, errors = [];
  for (const row of rows) {
    try {
      if (!row.name || !row.email || !row.subject) {
        errors.push({ name: row.name||'Unknown', error: 'Name, email, subject required' });
        continue;
      }
      const exists = await Teacher.findOne({ email: row.email.toLowerCase() });
      if (exists) { skipped++; continue; }
      await Teacher.create({ ...row, email: row.email.toLowerCase() });
      created++;
    } catch (e) { errors.push({ name: row.name||'?', error: e.message }); }
  }
  res.json({ created, skipped, errors, total: rows.length });
});
