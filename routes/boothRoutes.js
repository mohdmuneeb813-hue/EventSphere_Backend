const express = require('express');
const router = express.Router();
const { applyBooth, getAllBooths, updateBoothStatus } = require('../controllers/boothController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Exhibitor applies for a booth (any authenticated user may apply)
router.post('/apply', verifyToken, applyBooth);

// Anyone may browse booth listings
router.get('/all', getAllBooths);

// Admin-only: approve / reject booth applications
router.put('/status/:boothId', verifyToken, authorize('admin'), updateBoothStatus);

module.exports = router;
