const ScanRecord = require('../models/ScanRecord');
const RepairRecord = require('../models/RepairRecord');

exports.getSerialDetails = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const scan = await ScanRecord.findOne({ serialNumber })
      .populate('productionLine', 'name')
      .populate('operator', 'name')
      .populate('verifiedBy', 'name');
    if (!scan) return res.status(404).json({ message: 'Serial not found' });

    if (scan.serialStatus && scan.secondSerialStatus === 'PASS') {
      return res.status(400).json({ message: 'Serial already verified' });
    }

    res.json({
      line: scan.productionLine?.name || '-',
      model: scan.model,
      firstStatus: scan.serialStatus,
      firstOperator: scan.operator?.name || scan.name || '-',
      firstScanTime: scan.scannedAt,
      secondStatus: scan.verificationStage >= 2 ? scan.secondSerialStatus : '-',
      secondVerifier: scan.secondVerifierName || scan.verifiedBy?.name || '-',
      secondScanTime: scan.finalScanTime,
      verificationStage: scan.verificationStage,
    });
  } catch (e) {
    res.status(500).json({ message: 'Error', error: e.message });
    console.error(e);
  }
};

exports.recordRepair = async (req, res) => {
  try {
    const { model, serialNumber, reason, technicianName } = req.body;
    if (!model || !serialNumber || !reason || !technicianName) return res.status(400).json({ message: 'All fields required' });
    const repair = new RepairRecord({ model, serialNumber, reason, technicianName });
    await repair.save();
    res.json({ message: 'Repair recorded', repair });
  } catch (e) {
    res.status(500).json({ message: 'Error', error: e.message });
    console.error(e);
  }
};

exports.listRepairs = async (req, res) => {
  try {
    const repairs = await RepairRecord.find().sort({ repairedAt: -1 });
    res.json(repairs);
  } catch (e) {
    res.status(500).json({ message: 'Error', error: e.message });
  }
};

exports.deleteScanRecord = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    await ScanRecord.deleteOne({ serialNumber });
    res.json({ message: 'Scan record deleted' });
  } catch (e) {
    res.status(500).json({ message: 'Error', error: e.message });
  }
};
