var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

// Get the group and user models
var User = mongoose.model('User')
var Group = mongoose.model('Group')

/* POST new group */
router.post('/', function(req, res, next){
    // First, find the user
    User.findOne({_id: req.body.userId}, function(err, user){
        if (err){
            next(err);
        }else if(!user){
            // No user found. Did they forget to provide the fingerprint?
            next(new Error("No user exists with id " + req.body.id))
        }else{
            // Cool. Got the user. Now build a new group
            new Group({
                name: req.body.name,
                userIds: [user._id]
            }).save(function(err, group, count){
                if(err){
                    next(err);
                }else{
                    // Now we need to add this group id to the users group
                    user.groups.push(group._id)
                    user.save()

                    // Finally, build the response
                    var response = {}
                    response['success'] = true
                    response['id'] = group._id
                    res.send(response);
                }
            })
        }
    })
})

/* GET all groups */
router.get('/', function(req, res, next){
    Group.find(function(err, groups){
        if(err){
            next(err)
        }else{
            res.send(groups)
        }
    })
})

/* DELETE a group */
router.delete('/:id', function(req, res, next){
    Group.findOneAndRemove({_id: req.param('id')}, function(err, group){
        if(err){
            next(err);
        }else if(!group){
            next(new Error("No group given id " + req.param('id')))
        }else{
            res.send({msg: "success"});
        }
    })
})

module.exports = router;
