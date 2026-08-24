const mongoose = require('mongoose');
const User = require('./transaction');

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },

    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    members: {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: User,
            required: true,
        },
        role: {
            type: String,
            enum: ['admin', 'editor', 'viewer'],
            required: true,
        }
    },

    budgetLimit: {
        type: Number,
        min: 0,
    }

});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;