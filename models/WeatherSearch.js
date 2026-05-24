const mongoose = require('mongoose');

const WeatherSearchSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['current', 'forecast'],
    default: 'current'
  },
  temperature: Number,
  description: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WeatherSearch', WeatherSearchSchema);
