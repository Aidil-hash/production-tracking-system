const express = require('express');
const router = express.Router();
const technician = require('../controllers/technicianController');

router.get('/serial/:serialNumber', technician.getSerialDetails);
router.post('/repair', technician.recordRepair);
router.get('/repairs', technician.listRepairs);
router.delete('/scan/:serialNumber', technician.deleteScanRecord);

module.exports = router;
