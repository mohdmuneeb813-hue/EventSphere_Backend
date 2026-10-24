const express = require('express');
const router = express.Router();
const { createExpo, getAllExpos, updateExpo, deleteExpo } = require('../controllers/expoController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Public: any visitor may browse the expo list
router.get('/all', getAllExpos);

// Admin-only: create / update / delete expos
router.post('/create', verifyToken, authorize('admin'), createExpo);
router.put('/update/:id', verifyToken, authorize('admin'), updateExpo);
router.delete('/delete/:id', verifyToken, authorize('admin'), deleteExpo);

module.exports = router;
