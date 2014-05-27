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

// TODO TODO TODO -- Not yet rewritten //
/* GET a random blurt */
router.get('/Gimme', function(req, res, next){
    // Find the user given the fingerprint
    User.findOne({fingerprint: req.body.fingerprint}, function(err, user){
        if (err){
            next(err)
        }else if (!user){
            next(new Error("No user exists with fingerprint " + req.body.fingerprint))
        }else{
            // We have a user. See if there is a specific group
            Group.findOne({_id: req.body.groupId}, function(err, group){
                if(err){
                    next(err)
                }else{
                    // Group may be undefined which is global
                    if (!group){
                        group = {_id: undefined}
                    }

                    // Find a blurt for this group
                    Blurt.find({
                        groupId: group._id,
                        creatorId: {$ne: user._id},
                        isReply: false,
                        receiverId: undefined
                    }, function(err, blurts){
                        if (err){
                            next(err)
                        }else if(blurts.length == 0){
                            // Nothing to send!
                            res.send({msg: "No new blurts"})
                        }else{
                            // Pick one at random
                            var blurt = blurts[Math.floor(Math.random() * blurts.length)]
                            
                            // possible race condition! Theoretically 2 people could receive this blurt
 
                            // Immediately set the blurts receiver id
                            blurt.receiverId = user._id;
                            if (blurt.requiresResponse){
                                blurt.timeout = Date.now() + 7200000; // 2 hours
                            }
                            blurt.save()

                            // Give this blurt to the user
                            user.receivedBlurts.push(blurt._id)
                            user.save()

                            // Now send this blurt to the user
                            res.send(blurt)
                        }
                    })
                }
            })
        }
    })
})

/* GET blurts for a specific user */
router.get('/', function(req, res, next){
    console.log("beforeDateBody = " + req.body.beforeDate)
    // Figure out what the beforeDate is
    var beforeDate;
    if (req.body.beforeDate != undefined){
        // Verify the date has been set
        try{
            beforeDate = new Date(req.body.beforeDate)
        }catch(err){
            // Oh no.
            next(new Error("Invalid beforeDate."))
        }
    }else{
        beforeDate = new Date() // Now!
    }

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
                if (blurt.groupId){
                    resBlurt.groupId = blurt.groupId
                }
                resBlurt.requiresReply = blurt.requiresReply
                if (blurt.replyId){
                    resBlurt.replyId = blurt.replyId
                }
                if (blurt.replyingToId){
                    resBlurt.replyingToId = blurt.replyingToId
                }
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

/* GET public blurts */
router.get('/Public', function(req, res, next){
    // Run the find on blurts given the beforeDate and groupId

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
