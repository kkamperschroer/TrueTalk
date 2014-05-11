var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.ObjectId

// The blurt model
var blurtSchema = new Schema({
    creatorId: {type: ObjectId, required: true},
    content: {type: String, required: true},
    groupId: ObjectId,
    requiresReply: {type: Boolean, default: false},
    isPublic: {type: Boolean, default: true},
    replyId: ObjectId,
    replyingToId: ObjectId,
    receiverId: ObjectId,
    createdDate: {type: Date, default: Date.now},
    timeout: Date
});

mongoose.model('Blurt', blurtSchema);