var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.ObjectId

// The blurt model
var blurtSchema = new Schema({
    createdDate: {type: Date, default: Date.now},
    content: {type: String, required: true},
    creatorId: {type: ObjectId, required: true},
    receiverId: ObjectId,
    groupId: ObjectId,
    replyingId: ObjectId,
    requiresResponse: {type: Boolean, default: false},
    isReply: {type: Boolean, default: false},
    flagged: {type: Boolean, default: false},
    timeout: Date
});

mongoose.model('Blurt', blurtSchema);