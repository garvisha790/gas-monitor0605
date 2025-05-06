//usermodel is 
const mongoose = require('mongoose');
const { getTestDB } = require('../config/db');
 
const userSchema = new mongoose.Schema({

  name: { 

    type: String, 

    required: true 

  },

  email: { 

    type: String, 

    required: true, 

    unique: true,

    trim: true,

    lowercase: true

  },

  password: { 

    type: String, 

    required: true 

  },

  createdAt: {

    type: Date,

    default: Date.now

  }

});

// Create a model using the test database connection
const testDB = getTestDB();

// If testDB is available, use it; otherwise, fall back to the default connection
module.exports = testDB ? testDB.model('User', userSchema) : mongoose.model('User', userSchema);