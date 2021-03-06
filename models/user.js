var mongoose = require('mongoose');
var Schema = mongoose.Schema
var ObjectId = Schema.ObjectId

// The user model
var userSchema = new Schema({
  fingerprint: {type: String, unique: true, required: true},
  secret: {type: String, required: true},
  createdDate: {type: Date, default: Date.now},
  createdIp: {type: String, required: true},
  lastActiveDate: {type: Date, default: Date.now},
  blurts: [ObjectId],
  currentBlurts: [ObjectId],
  groups: [ObjectId],
});

// Ensure our index on fingerprint is unique.
userSchema.path('fingerprint').index({unique: true});

mongoose.model('User', userSchema);