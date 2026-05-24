const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  desc: String,
  amount: Number,
  paidBy: String,
  category: String,
  date: String,
  splitAmong: [String]
});

const BudgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tripName: {
    type: String,
    default: 'My Trip'
  },
  members: [String],
  expenses: [ExpenseSchema],
  totalBudget: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: '₹'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Budget', BudgetSchema);