const mongoose = require("mongoose");
const urlData = require("./url");

const urlSchema = mongoose.Schema({
  
  url: {
    type: String,
    required: true,
    unique: true,
  },
  shrinked: {
    type: String,
    unique: true,
  },
  click: { type: Number, default: 0 },
  created: {
    type: Date,
    default: Date.now(),
  },
  likes: { type: Number, default: 0 },
});

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
    default: new Date(),
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  passwordresetToken: String,
  passwordresetExpires: String,
  urls: [urlSchema],
});



module.exports = mongoose.model("User", User, "user");
