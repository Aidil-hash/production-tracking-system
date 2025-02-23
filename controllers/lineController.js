// controllers/lineController.js

const { lines } = require('../models/lineModel');

// Create or initialize a new production line
const createLine = (req, res) => {
  const { model, materialCount } = req.body;

  // Basic validation
  if (!model || materialCount == null) {
    return res.status(400).json({ message: 'Model and materialCount are required' });
  }

  // Create a new line object
  const newLine = {
    id: lines.length + 1,
    model,
    currentMaterialCount: materialCount,
    totalOutputs: 0,
    startTime: Date.now() // record the time we started tracking
  };

  lines.push(newLine);

  return res.status(201).json({
    message: 'Production line created',
    line: newLine
  });
};

// Update an existing line’s model or material count (e.g., if the leader changes the model)
const updateLine = (req, res) => {
  const { lineId } = req.params;
  const { model, materialCount } = req.body;

  const line = lines.find((l) => l.id === parseInt(lineId));
  if (!line) {
    return res.status(404).json({ message: 'Line not found' });
  }

  if (model) {
    line.model = model;
  }
  if (materialCount != null) {
    line.currentMaterialCount = materialCount;
  }

  return res.status(200).json({
    message: 'Line updated',
    line
  });
};

// Operator scans a serial number -> increment output & decrement material
const scanSerial = (req, res) => {
  const { lineId } = req.params;
  const line = lines.find((l) => l.id === parseInt(lineId));
  if (!line) {
    return res.status(404).json({ message: 'Line not found' });
  }

  // Increment totalOutputs
  line.totalOutputs += 1;
  // Decrement material count
  if (line.currentMaterialCount > 0) {
    line.currentMaterialCount -= 1;
  }

  return res.status(200).json({
    message: 'Serial scanned, output recorded',
    line
  });
};

// Get info about a specific line
const getLine = (req, res) => {
  const { lineId } = req.params;
  const line = lines.find((l) => l.id === parseInt(lineId));
  if (!line) {
    return res.status(404).json({ message: 'Line not found' });
  }

  return res.status(200).json(line);
};

// Get all lines
const getAllLines = (req, res) => {
  return res.status(200).json(lines);
};

// Calculate efficiency (simple example: outputs / time elapsed)
// Time is in minutes or hours depending on your preference
const getLineEfficiency = (req, res) => {
  const { lineId } = req.params;
  const line = lines.find((l) => l.id === parseInt(lineId));
  if (!line) {
    return res.status(404).json({ message: 'Line not found' });
  }

  const currentTime = Date.now();
  const timeElapsedMs = currentTime - line.startTime; // in milliseconds
  const timeElapsedMinutes = timeElapsedMs / (1000 * 60);

  // Basic formula: outputs per minute
  let efficiency = 0;
  if (timeElapsedMinutes > 0) {
    efficiency = line.totalOutputs / timeElapsedMinutes;
  }

  return res.status(200).json({
    lineId: line.id,
    model: line.model,
    totalOutputs: line.totalOutputs,
    timeElapsedMinutes: timeElapsedMinutes.toFixed(2),
    efficiencyPerMinute: efficiency.toFixed(2)
  });
};

// Predict material low and send notification if needed
const predictMaterialLow = (req, res) => {
    const { lineId } = req.params;
    const thresholdMinutes = 30; // Threshold in minutes for low material notification
  
    const line = lines.find((l) => l.id === parseInt(lineId));
    if (!line) {
      return res.status(404).json({ message: 'Line not found' });
    }
  
    const currentTime = Date.now();
    const timeElapsedMs = currentTime - line.startTime;
    const timeElapsedMinutes = timeElapsedMs / (1000 * 60);
  
    let efficiency = 0;
    if (timeElapsedMinutes > 0) {
      efficiency = line.totalOutputs / timeElapsedMinutes;
    }
  
    if (efficiency === 0) {
      // Not enough data to make a prediction yet
      return res.status(200).json({
        message: 'Not enough data to predict material depletion',
        line
      });
    }
  
    // Calculate predicted time to depletion (in minutes)
    const predictedTime = line.currentMaterialCount / efficiency;
  
    let notificationSent = false;
    if (predictedTime < thresholdMinutes) {
      // Simulate sending a notification (e.g., via email, SMS, etc.)
      console.log(`Notification: Material on line ${line.id} is low. Predicted depletion in ${predictedTime.toFixed(2)} minutes.`);
      notificationSent = true;
      // Here, you could integrate with a notification service like nodemailer, Twilio, etc.
    }
  
    return res.status(200).json({
      message: 'Prediction calculated',
      lineId: line.id,
      currentMaterialCount: line.currentMaterialCount,
      totalOutputs: line.totalOutputs,
      timeElapsedMinutes: timeElapsedMinutes.toFixed(2),
      efficiencyPerMinute: efficiency.toFixed(2),
      predictedTimeToDepletion: predictedTime.toFixed(2),
      notificationSent
    });
  };
  
  module.exports = {
    createLine,
    updateLine,
    scanSerial,
    getLine,
    getAllLines,
    getLineEfficiency,
    predictMaterialLow
  };
