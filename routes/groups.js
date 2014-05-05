var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

// Get the group and user models
var User = mongoose.model('User')
var Group = mongoose.model('Group')

/* POST new group */
router.post('/', function(req, res, next){
    // First, find the user
    User.findOne({fingerprint: req.body.userFingerprint}, function(err, user){
        if (err){
            next(err);
        }else{
            // Cool. Got the user. Now build a new group
            new Group({
                name: req.body.name,
                userIds: [user._id]
            }).save(function(err, group, count){
                if(err){
                    next(err);
                }else{
                    res.send(group);
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
    Group.findOne({_id: req.param('id')}, function(err, group){
        if(err){
            next(err);
        }else{
            res.send({msg: "success"});
        }
    })
})

module.exports = router;
