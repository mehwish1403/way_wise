const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  time: String,
  title: String,
  type: String,
  description: String,
  tip: String,
  duration: String
});

const DaySchema = new mongoose.Schema({
  dayNumber: Number,
  date: String,
  title: String,
  activities: [ActivitySchema]
});

const TripSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tripTitle: {
    type: String,
    required: true
  },
  origin: String,
  destination: {
    type: String,
    required: true
  },
  startDate: Date,
  endDate: Date,
  numDays: Number,
  travellers: Number,
  budgetType: String,
  travelStyle: String,
  estimatedBudget: String,
  overview: String,
  days: [DaySchema],
  packingTips: [String],
  importantNotes: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Trip', TripSchema);