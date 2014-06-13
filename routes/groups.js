var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

// Get the group and user models
var User = mongoose.model('User')
var Group = mongoose.model('Group')

/* POST new group */
router.post('/', function(req, res, next){
    // Build a new group
    new Group({
        name: req.body.name,
        userIds: [req.user._id]
    }).save(function(err, group, count){
        if(err){
            next(err);
        }else{
            // Now we need to add this group id to the users group
            req.user.groups.push(group._id)
            req.user.save()

            // Finally, build the response
            var response = {}
            response.success = true
            response.id = group._id
            res.send(response);
        }
    })
})

/* POST to join a group */
router.post('/Join', function(req, res, next){
    // Check if this group exists
    Group.findOne({_id: req.body.groupId}, function(err, group){
        // Ensure the user is not already a member of this group
        if(group.members.indexOf(req.user._id) > -1){
            // Oh no. Already exists. Can't re-join
            next(new Error("User is already a member of this group"))
        }else{
            // Alias the user to make references smaller
            var user = req.user

            // Update the users group
            user.groups.push(group._id)
            user.save()

            // Update the groups members
            group.members.push(user._id)
            group.save()

            // Ok. Build the response
            var response = {}
            response.success = true
            res.send(response)
        }
    })
})

/* GET all groups */
router.get('/', function(req, res, next){
    // Get the offset setup correctly
    var offset = req.body.offset | 0

    // Grab the top 50 from offset, sorted alphabetically
    Group.find({},
               null,
               {limit: 50, skip: offset, sort: {name: -1}},
               function(err, groups){
        if(err){
            next(err)
        }else{
            // Build the response
            var response = {}
            response.success = true

            // Build the array of groups
            var groupsResponse = []
            for(var i=0; i<groups.length; i++){
                var curGroup = {}
                curGroup.name = groups[i].name
                curGroup.id = groups[i]._id
                curGroup.isMember = (req.user.groups.indexOf(curGroup.id) > -1)

                // Push it into our groups array
                groupsResponse.push(curGroup)
            }

            // Set the groups object we respond with
            response.groups = groupsResponse

            // Send it off
            res.send(response)
        }
    })
})

/* POST to leave a group */
router.post('/Leave', function(req, res, next){
    // Find the group
    Group.findOne({_id: req.body.groupId}, function(err, group){
        if (err){
            next(err)
        }else{
            // Alias the user to make references smaller
            var user = req.user

            // Remove this user from the array of members
            var idx = group.members.indexOf(user._id)
            group.members.splice(idx, 1)

            // Remove this group for this user
            idx = user.groups.indexOf(group._id)
            user.groups.splice(idx, 1)

            // Save them both
            group.save()
            user.save()

            // Build the response
            var response = {}
            response.success = true

            res.send(response)

            // We should now see if this group should be removed
            if (group.members.length == 0){
                // Delete it!
                group.remove()
            }
        }
    })
})

/* GET the group size */
router.get('/Size', function(req, res, next){
    // Find this group
    Group.findOne({_id: req.body.groupId}, function(err, group){
        if (err){
            next(err)
        }else{
            // Get the number of members
            var size = group.members.length

            // Return success with this size
            var response = {}
            response.success = true
            response.size = size

            res.send(response)
        }
    })
})

module.exports = router;
