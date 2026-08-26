const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    },

    category: {
        type: String
    },

    monthlyLimit: {
        type: Number,
        min: 0,
        required: true,
    }

});

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;