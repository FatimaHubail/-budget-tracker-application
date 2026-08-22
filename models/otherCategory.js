const mongoose = require('mongoose');

const othersSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },

    type: {
        type: String,
        enum: ['income', 'expense'],
        required: true,
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },

});

othersSchema.index({ name: 1, type: 1, user: 1 }, { unique: true });

const OtherCategory = mongoose.model('OtherCategory', othersSchema);

module.exports = OtherCategory;