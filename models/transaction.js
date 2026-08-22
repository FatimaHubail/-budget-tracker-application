const mongoose = require('mongoose');

// create the schema
const transactionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  description: {
    type: String,
  },

  amount: {
    type: Number,
    required: true,
    min: 0,
  },

  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true,
  },

  category: {
    type: String,
    enum: ['food', 'groceries', 'transport', 'bills', 'rent', 'entertainment',
      'shopping', 'health', 'education', 'travel', 'subscriptions',
      'salary', 'freelance', 'gift', 'investment', 'other'],
  },

  customCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OtherCategory',
  },

  date: {
    type: Date,
    required: true,
    default: Date.now(),
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

// initialize the model
const User = mongoose.model('Transaction', transactionSchema);

// export it
module.exports = User;
