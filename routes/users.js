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
        .update(req.toString() + Math.random().toString + "salty")
        .digest("hex");

    // Looks good enough! Save it off!
    new User({
        fingerprint: req.body.fingerprint,
        createdIp: req.ip,
        secret: secret
    }).save(function(err, user, count){
        if (err){
            next(err)
        }else{
            // Looks good. Let's build the appropriate response
            var response = {}
            response.success = true
            response.id = user._id
            response.secret = user.secret
            res.send(response)
        }
    });
});



module.exports = router;
