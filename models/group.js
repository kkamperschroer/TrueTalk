var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.ObjectId

// The group model
var groupSchema = new Schema({
    createdDate: {type: Date, default: Date.now},
    name: {type: String, unique: true, required: true},
    userIds: [ObjectId]
});

// Ensure the group name is unique
groupSchema.path('name').index({unique: true});

mongoose.model('Group', groupSchema);