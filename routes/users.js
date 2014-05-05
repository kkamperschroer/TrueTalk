var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var crypto = require('crypto');

// Get the user schema
var User = mongoose.model('User');

/* POST new user */
router.post('/', function(req, res, next){
    // Build the secret for this user
    var secret = crypto
        .createHash("sha256")
        .update(req.toString()).digest("hex");

    // Looks good enough! Save it off!
    new User({
        fingerprint: req.body.id,
        createdIp: req.ip,
        secret: secret
    }).save(function(err, user, count){
        if (err){
            next(err);
        }else{
            res.send(user);
            return;               
        }
    });
});

/* GET user with fingerprint. */
router.get('/:id', function(req, res, next) {
    User.findOne({fingerprint: req.param('id')}, function (err, user){
        if (err){
            next(err);
        }else{
            res.send(user);
        }
    })
});

/* GET all users */
router.get('/', function(req, res, next){
    User.find(function(err, users){
        if (err){
            next(err);
        }else{
            res.send(users);
        }
    })
})

/* DELETE a user by fingerprint.  */
router.delete('/:id', function(req, res, next){
    User.findOneAndRemove({fingerprint: req.param('id')}, function(err){
        if (err){
            next(err);
        }else{
            res.send({msg: "success"});
        }
    })
})

module.exports = router;
