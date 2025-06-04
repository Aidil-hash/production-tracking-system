const express = require('express');
const router = express.Router();
const leaderController = require('../controllers/leaderController');

router.post('/set-hourly-targets', leaderController.setHourlyTargets);
router.get('/get-hourly-targets', leaderController.getHourlyTargets);
router.get('/get-actuals', leaderController.getActualsBySlot);

module.exports = router;
