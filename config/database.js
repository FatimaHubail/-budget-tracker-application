const mongoose = require('mongoose');

mongoose.connect(process.env.DATABASE_URI);

mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
});
