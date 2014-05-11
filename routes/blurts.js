var express = require('express');
var router = express.Router();
var mongoose = require('mongoose')

// We need all three models
var User = mongoose.model('User')
var Group = mongoose.model('Group')
var Blurt = mongoose.model('Blurt')

/* POST new blurt */
router.post('/', function(req, res, next){
    // Find the user
    User.findOne({fingerprint: req.body.fingerprint}, function(err, user){
        if(err){
            next(err)
        }else if(!user){
            next(new Error("No user exists with fingerprint " + req.body.fingerprint))
        }else{
            // Looks good. Build a new blurt
            new Blurt({
                content: req.body.content,
                creatorId: user._id,
                groupId: req.body.groupId,
                replyingId: req.body.replyingId,
                requiresResponse: req.body.requiresResponse | false,
                isReply: req.body.isReply | false,
                isReplyTo: req.body.isReplyTo
            }).save(function(err, blurt, count){
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

                                // Update the user
                                user.blurts.push(blurt._id)
                                user.save()

                                // Send the response
                                res.send(blurt)
                            }
                        })
                    }else{
                        // No group. Update user and send blurt
                        user.blurts.push(blurt._id)
                        user.save()
                        res.send(blurt)
                    }
                }
            })
        }
    })
})

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
router.get('/Mine', function(req, res, next){
    // Find the user with this fingerprint
    User.findOne({fingerprint: req.body.fingerprint}, function(err, user){
        if (err){
            next(err)
        }else if (!user){
            next(new Error("No user found with fingerprint " + req.body.fingerprint))
        }else{
            // We have a user. Find all the blurts they own
            Blurt.find({creatorId: user._id}, function(err, blurts){
                if (err){
                    next(err)
                }else{
                    res.send(blurts)
                }
            })
        }
    })
})

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
