var express = require('express')
var router = express.Router();
var mongoose = require('mongoose')
var crypto = require('crypto')

// We need the user model
var User = mongoose.model('User')

// The api key for test, IOS, and Android
API_KEYS = {
    test: "4eff59090da963f54fefc9d848abcd65c75b1176eccd21d3061e30c042b0c5fc",
    ios: "94cfbec239cc47746466b23c33fd017ac9f507a7938ec2aa589daadf5e7153f7",
    android: "13593d3a3be7b86beef127cb3bac0a245fc63af79aa26b0c8bfa989eb5e5df1b"
}

// Authenticate all posts
router.post('/*', function(req, res, next){
    // Call our auth function
    authenticate(req, res, next)
})

// Authenticate all gets
router.get('/*', function(req, res, next){
    // Call our auth function
    authenticate(req, res, next)
})

function authenticate(req, res, next){
    // Find this user
    User.findOne({_id: req.param('userId')}, function(err, user){
        if (err){
            next(err)
        }else if(!user){
            // Let's see if if this was a post for /Users
            if(req.originalUrl != "/Users" ||
                req.method != "POST"){
                // Yikes. No such user and we need one
                res.send({
                    success: false,
                    reason: "Invalid user id"
                })
            }
        }

        // Ok. Let's build up the signature, ignoring signature
        var preSignature = ""
        for (var key in req.body){
            if (key == "signature"){
                 continue
            }else{
                preSignature += key + req.body[key]
             }
        }

        // Find the corresponding API key
        preSignature += API_KEYS[req.body['client']]

        // Append the user if we have one
        if (user){
            preSignature += user.secret

            // Save the last active date for this user as well
            user.lastActiveDate = Date.now()
            user.save()

            // While we are here, save off the user for later
            req.user = user

        }

        //console.log("Built preSignature = " + preSignature)

        // Ok. Now sha256 the whole thing
        var signature = crypto
            .createHash("sha256")
            .update(preSignature)
            .digest("hex")

         // Signature built. See if it's a match
        if (req.param('signature') != signature){
            // Oh no. Invalid signature
            res.send({
                success: false,
                reason: "Invalid signature"
            })
        }else{
            // Signature looks good. Move it along!
            next()
        }
    })
}


module.exports = router;