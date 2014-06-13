var express = require('express');
var router = express.Router();
var mongoose = require('mongoose')

// We need all three models
var User = mongoose.model('User')
var Group = mongoose.model('Group')
var Blurt = mongoose.model('Blurt')

/* POST new blurt */
router.post('/', function(req, res, next){
    // Build a new blurt
    new Blurt({
        content: req.body.content,
        creatorId: req.user._id,
        groupId: req.body.groupId,
        requiresReply: req.body.requiresReply | false,
        isPublic: req.body.isPublic | true
    }).save(function(err, blurt){
        if(err){
            next(err)
        }else{
            // If there is a group id attached, we need to
            // add this blurt to it
            if (req.body.groupId){
                Group.findOne({_id: req.body.groupId}, function(err, group){
                    if (err){
                        next(err);
                    }else if (!group){
                        // Oh no. Backtrack and delete this blurt
                        blurt.remove()
                        next(new Error("No group exists with id " + req.body.groupId))
                    }else{
                        // Update the group
                        group.blurts.push(blurt._id)
                        group.save()

                        // Update the user and send the blurt
                        sendBlurtResponse(blurt, req.user, res)
                    }
                })
            }else{
                // Update the user and send the blurt
                sendBlurtResponse(blurt, req.user, res)
            }
        }
    })
})

// Helper function to build the blurt response
function sendBlurtResponse(blurt, user, res){
    // Save this as one of the users blurts
    user.blurts.push(blurt._id)
    user.save()

    // Build the response
    var response = {}
    response.success = true
    response.id = blurt._id

    // Send it off
    res.send(response)
}

/* POST a reply to a blurt */
router.post('/Reply', function(req, res, next){
    // Let's find the blurt this is referring to
    Blurt.findOne({
        _id: req.body.replyingToId
    }, function(err, blurt){
        if (err){
            next(err)
        }else if(!blurt){
            next(new Error("No blurt exists with the given id: " + req.body.replyingToId))
        }else{
            // Validate this user is supposed to be replying to
            // this blurt by grabbing the index
            var idx = req.user.currentBlurts.indexOf(blurt._id)

            // We also need to ensure the receiveId is this user
            var isCorrectReceiver = (req.user._id.equals(blurt.receiverId))
            if (idx < 0){
                // Error out
                next(new Error("User not allowed to reply to this blurt. They are not assigned."))
            }else if(!isCorrectReceiver){
                // Error out
                next(new Error("This user has the blurt in currentBlurts, but is not the assigned receiver"))
            }else{
                // We are ok. We can reply to it!

                // Create a new blurt
                new Blurt({
                    content: req.body.content,
                    creatorId: req.user._id,
                    groupId: req.body.groupId, // may be undefined
                    requiresReply: false,
                    isPublic: blurt.isPublic,
                    replyingToId: blurt._id,
                    receiverId: blurt.creatorId
                }).save(function(err, replyBlurt){
                    if(err){
                        next(err)
                    }else{
                        // Update the blurt replyId
                        blurt.replyId = replyBlurt._id
                        blurt.save()

                        // Update the users blurts
                        req.user.blurts.push(replyBlurt._id)
                        req.user.currentBlurts.splice(idx, 1)
                        req.user.save()

                        // Build the response up
                        var response = {}
                        response.success = true
                        response.id = replyBlurt._id

                        // Send it off
                        res.send(response)
                    }
                })
            }
        }
    })
})

/* GET a random blurt */
router.get('/Random', function(req, res, next){
    // We need to grab one blurt randomly using the (possibly)
    // provided group id
    Blurt.find({
        groupId: req.body.groupId,
        creatorId: {$ne: req.user._id},
        replyingToId: undefined, // Don't want a reply
        receiverId: undefined
    }, function(err, blurts){
        if(err){
            next(err)
        }else if(blurts.length == 0){
            // Nothing to send
            var response = {}
            response.success = false
            response.reason = "No new blurts available at this time"

            // Send it off
            res.send(response)
        }else{
            // Grab one of these randomly
            var blurt = blurts[Math.floor(Math.random()*blurts.length)]

            // Set the blurts receiver id
            blurt.receiverId = req.user._id

            if (blurt.requiresReply){
                blurt.timeout = Date.now() + 7200000; // 2 hours
            }

            // Save it
            blurt.save()

            // Push this blurts onto our users blurts
            req.user.currentBlurts.push(blurt._id)
            req.user.save()

            // Now build the appropriate response
            var response = {}
            response.success = true
            response.id  = blurt._id
            response.content = blurt.content
            response.createdDate = blurt.createdDate
            response.requiresReply = blurt.requiresReply
            response.timeout = blurt.timeout
            response.isPublic = blurt.isPublic

            // Send it off
            res.send(response)
        }
    })

})

/* GET blurts for a specific user */
router.get('/', function(req, res, next){
    // Figure out what the beforeDate is
    var beforeDate = getBeforeDateTime(req.body.beforeDate)

    // Get all of the blurts for this user before the specific date
    Blurt.find({creatorId: req.user._id, createdDate: {$lte: beforeDate}},
               null,
               {limit: 50, sort: {createdDate: -1}},
               function(err, blurts){
        if(err){
            next(err)
        }else{
            // Build up the real response
            var response = {}
            response.success = true;

            // Build up our blurts
            var resBlurts = []
            for(var i=0; i<blurts.length; i++){
                // Get the current blurt
                var blurt = blurts[i]

                // Build the response blurt object
                var resBlurt = {}
                resBlurt.id = blurt._id
                resBlurt.content = blurt.content
                resBlurt.groupId = blurt.groupId
                resBlurt.requiresReply = blurt.requiresReply
                resBlurt.replyId = blurt.replyId
                resBlurt.replyingToId = blurt.replyingToId
                resBlurt.createdDate = blurt.createdDate

                // Push the newly built blurt into our array
                resBlurts.push(resBlurt)
            }
            // Our response needs blurts!
            response.blurts = resBlurts

            // Send the response
            res.send(response)
        }               
   })
})

// Helper function to get the beforeDate value
function getBeforeDateTime(beforeDate){
    var retDate;
    if (beforeDate != undefined){
        // Verify the date has been set
        try{
            retDate = new Date(beforeDate)
        }catch(err){
            // Oh no.
            next(new Error("Invalid beforeDate."))
        }
    }else{
        retDate = new Date() // Now!
    }

    // Return our built date
    return retDate;
}

/* GET public blurts */
router.get('/Public', function(req, res, next){
    // Setup the before date var
    var beforeDate = getBeforeDateTime(req.body.beforeDate)

    // Run the find on blurts given the beforeDate and groupId
    Blurt.find({
                    isPublic: true,
                    groupId: req.body.groupId, // May be undefined for global
                    createdDate: {$lte: beforeDate}
                },
               null,
               {limit: 50, sort: {createdDate: -1}},
               function(err, blurts){
        if(err){
            next(err)
        }else{
            // Build up the response
            var response = {}
            response.success = true

            var blurtResponses = []
            for(var i=0; i<blurts.length; i++){
                var blurt = blurts[i]
                var blurtResponse = {}
                blurtResponse.id = blurt._id
                blurtResponse.content = blurt.content
                blurtResponse.groupId = blurt.groupId
                blurtResponse.requiresReply = blurt.requiresReply
                blurtResponse.replyId = blurt.replyId
                blurtResponse.replyingToId = blurt.replyingToId
                blurtResponse.createdDate = blurt.createdDate

                // Push it into our response array
                blurtResponses.push(blurtResponse)
            }
            // Attach the array to our response
            response.blurts = blurtResponses

            // Send it off
            res.send(response)
        }
    })
})

/* GET the replies for this user */
router.get('/Replies', function(req, res, next){
    // Setup the before date var
    var beforeDate = getBeforeDateTime(req.body.beforeDate)

    // Run the find on blurts given the beforeDate and groupId
    Blurt.find({
                    receiverId: req.user._id,
                    createdDate: {$lte: beforeDate}
                },
               null,
               {limit: 50, sort: {createdDate: -1}},
               function(err, blurts){
        if(err){
            next(err)
        }else{
            // Build the response
            var response = {}
            response.success = true

            var blurtsResponse = []
            for(var i=0; i<blurts.length; i++){
                var curBlurt = blurts[i]
                var resBlurt = {}
                resBlurt.id = curBlurt._id
                resBlurt.createdDate = curBlurt.createdDate
                resBlurt.content = curBlurt.content
                resBlurt.replyingToId = curBlurt.replyingToId

                blurtsResponse.push(resBlurt)
            }

            // Attach the built blurts to the response
            response.blurts = blurtsResponse

            // Send it off
            res.send(response)
        }
    })
})

/* POST to defer a blurt */
router.post('/Defer', function(req, res, next){
    var response = {todo: "working on it!"}
    res.send(response)
})

module.exports = router;
