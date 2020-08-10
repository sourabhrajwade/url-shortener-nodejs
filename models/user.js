const mongoose = require("mongoose");

const User = mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: new Date()
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  passwordresetToken: String,
  passwordresetExpires: String
});

module.exports = mongoose.model("User", User, "user");
