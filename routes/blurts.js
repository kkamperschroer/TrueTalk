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
    // todo
})

/* GET a random blurt */
router.get('/Random', function(req, res, next){
    // TODO -- Write this!
    
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

// TODO TODO TODO -- Not yet rewritten //
/* GET blurts that are responses for a specific user */
router.get('/Responses', function(req, res, next){
    // Find the user with this fingerprint
    User.findOne({fingerprint: req.body.fingerprint}, function(err, user){
        if(err){
            next(err)
        }else if (!user){
            next(new Error("No user found with fingerprint " + req.body.fingerprint))
        }else{
            // We have a user. Grab some blurts
            Blurt.find({
                '_id' : {$in: user.receivedBlurts}
            }, function(err, blurts){
                if (err){
                    next(err)
                }else{
                    res.send(blurts)
                }
            })
        }
    })
})

module.exports = router;
