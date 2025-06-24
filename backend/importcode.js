const mongoose = require('mongoose');
const ModelCode = require('./models/ModelCode'); // adjust the path if needed

// 1. Connect to MongoDB
mongoose.connect('mongodb+srv://onlineDB:roland-123@cluster0.5irue.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// 2. Once connected, create and save a new ModelCode
mongoose.connection.once('open', async () => {
  try {
    const newModel = new ModelCode({
      code: '426731',      // Replace with your code
      modelName: 'PD-8H', // Replace with your model name
    });

    const result = await newModel.save();
    console.log('ModelCode added:', result);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    mongoose.connection.close();
  }
});