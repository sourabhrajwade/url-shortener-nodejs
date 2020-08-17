const mongoose = require('mongoose');

const urlSchema = mongoose.Schema({
  postedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    url: {
      type: String, required: true, unique: true
    },
    shrinked: {
      type: String,
      unique: true
    },
    click:{ type: Number, default: 0},
    created: {
      type: Date,
      default: Date.now()
    },
    likes: { type: Number, default: 0},
})

module.exports = mongoose.model('UrlData', urlSchema,'url');
