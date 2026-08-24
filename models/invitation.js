const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true,
    },

    email: {
        type: String,
        required: true,
        lowercase: true,
    },

    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    role: {
        type: String,
        enum: ['admin', 'editor', 'viewer'],
        required: true,
        default: 'viewer',
    },
    
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        required: true,
        default: 'pending',
    },
});

const Invitation = mongoose.model('Invitation', invitationSchema);
module.exports = Invitation;