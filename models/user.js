const mongoose = require('mongoose');
const validator = require('validator');
// create the schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: 'Invalid email format'
    }
  },
  
  username: {
    type: String,
    required: true,
  },

  password: {
    type: String,
    required: true,
  },
});


// initialize the model
const User = mongoose.model('User', userSchema);

// export it
module.exports = User;
