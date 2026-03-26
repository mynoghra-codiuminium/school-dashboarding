const express = require('express');
const { Class } = require('../models/index');
const { protect } = require('../middleware/auth');
const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  try {
    const classes = await Class.find().sort({ grade: 1, section: 1 });
    res.json(classes);
  } catch (err) { res.status(500).json({ message: err.message }); }
});
router.post('/', async (req, res) => {
  try {
    const c = await Class.create(req.body);
    res.status(201).json(c);
  } catch (err) { res.status(500).json({ message: err.message }); }
});
router.put('/:id', async (req, res) => {
  try {
    const c = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(c);
  } catch (err) { res.status(500).json({ message: err.message }); }
});
router.delete('/:id', async (req, res) => {
  try {
    await Class.findByIdAndDelete(req.params.id);
    res.json({ message: 'Class deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
module.exports = router;
