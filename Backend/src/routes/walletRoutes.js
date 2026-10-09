const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middleware/authMiddleware');
const { mockTopup, manualTopup, chargePenalty, getHistory } = require('../controllers/walletController');

// Spam-Click Prevent
const financialLimiter = rateLimit({
    windowMs: 5 * 1000,
    max: 1,
    message: { message: "Processing... Please wait a few seconds before trying again." }
});

router.use(protect);

// Customer endpoints
router.get('/history', getHistory);
router.post('/topup/mock', financialLimiter, authorize('CUSTOMER'), mockTopup);

// Admin & Superadmin endpoints
router.post('/topup/manual', financialLimiter, authorize('HUB_ADMIN', 'SUPERADMIN'), manualTopup);
router.post('/penalty', financialLimiter, authorize('HUB_ADMIN', 'SUPERADMIN'), chargePenalty);

module.exports = router;