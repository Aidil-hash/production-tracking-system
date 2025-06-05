const Line = require('../models/Line');
const Output = require('../models/Output');
const mongoose = require('mongoose');

// POST: Set hourly targets
exports.setHourlyTargets = async (req, res) => {
  try {
    const { lineId, date, slots } = req.body;

    if (!lineId || !Array.isArray(slots) || !date) {
      return res.status(400).json({ error: 'Missing or invalid fields' });
    }

    const line = await Line.findById(lineId);
    if (!line) return res.status(404).json({ error: 'Line not found' });

    line.hourlyTargets = line.hourlyTargets.filter(ht => ht.date !== date);
    line.hourlyTargets.push({ date, slots });

    const totalTarget = slots.reduce((sum, slot) => sum + Number(slot.target || 0), 0);
    line.targetOutputs = totalTarget;

    await line.save();

    const io = req.app.get('io');
    if (io) {
      const eventName = 'hourlyTargetsUpdated';
      io.emit(eventName, {
        lineId,
        date,
        slots,
        totalTarget
      });
    }

    res.json({
      lineId,
      date,
      slots,
      totalTarget,
      message: 'Hourly targets saved successfully!',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET: Fetch hourly targets for a line/date
exports.getHourlyTargets = async (req, res) => {
  try {
    const { lineId, date } = req.query;
    if (!lineId || !date) {
      return res.status(400).json({ error: 'Missing lineId or date' });
    }
    const line = await Line.findById(lineId);
    if (!line) return res.status(404).json({ error: 'Line not found' });

    const found = line.hourlyTargets.find(ht => ht.date === date);
    if (!found) return res.status(404).json({ error: 'No targets found' });

    res.json(found);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET: Fetch actuals from Output data for a line/date, grouped per slot
exports.getActualsBySlot = async (req, res) => {
  try {
    const { lineId, date } = req.query;
    if (!lineId || !date) return res.status(400).json({ error: 'Missing lineId or date' });

    const slots = [
      { label: "8.00 - 9.00", start: "08:00", end: "09:00" },
      { label: "9.00 - 10.00", start: "09:00", end: "10:00" },
      { label: "10.15 - 11.00", start: "10:15", end: "11:00" },
      { label: "11.00 - 11.30", start: "11:00", end: "11:30" },
      { label: "12.10 - 1.00", start: "12:10", end: "13:00" },
      { label: "1.00 - 2.00", start: "13:00", end: "14:00" },
      { label: "2.00 - 3.00", start: "14:00", end: "15:00" },
      { label: "3.15 - 4.00", start: "15:15", end: "16:00" },
      { label: "4.00 - 5.00", start: "16:00", end: "17:00" },
      { label: "5.00 - 5.30", start: "17:00", end: "17:30" },
      { label: "5.45 - 6.45", start: "17:45", end: "18:45" },
      { label: "6.45 - 7.45", start: "18:45", end: "19:45" }
    ];

    const results = [];

    for (let slot of slots) {
      // Convert date and time into Date objects
      const slotStart = new Date(`${date}T${slot.start}:00.000Z`);
      const slotEnd = new Date(`${date}T${slot.end}:00.000Z`);

      // Query and sum for this slot
      const outputs = await Output.aggregate([
        {
          $match: {
            lineId: new mongoose.Types.ObjectId(lineId),
            timestamp: { $gte: slotStart, $lt: slotEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$count" }
          }
        }
      ]);
      results.push({ time: slot.label, actual: outputs[0]?.total || 0 });
    }

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
