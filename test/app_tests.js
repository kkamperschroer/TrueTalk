var superagent = require('superagent')
var expect = require('expect.js')
var mongoose = require('mongoose')
require('../db.js')
var User = mongoose.model('User')
var Group = mongoose.model('Group')
var Blurt = mongoose.model('Blurt')

// Helper function for signing
var crypto = require('crypto')
function signRequest(request, secret){
  // Add our client id to the request
  request['client'] = "test"

  // Our secret key for signing in test
  var apiSecret = "4eff59090da963f54fefc9d848abcd65c75b1176eccd21d3061e30c042b0c5fc"

  // Build the signature, piece by piece
  var preSignature = ""
  for (var key in request){
    preSignature += key + request[key]
  }

  // Append the api key
  preSignature += apiSecret

  if(secret != undefined){
    // Append the user secret
    preSignature += secret
  }

  //console.log("Built preSignature = " + preSignature)

  // Build the signature
  signature = crypto
    .createHash("sha256")
    .update(preSignature)
    .digest("hex")

  // Add it to the object
  request["signature"] = signature;

  return request;
}


describe('TrueTalk api server', function(){
  // Variables we need during the tests  
  var api_url = "http://localhost:3000/"
  var userId1
  var secret1
  var userId2
  var secret2
  var groupId
  var blurtId1
  var blurtId2
  var replyId1
  var replyId2
  var testGroupName = "Test Group Name!"
  var testBlurtContent = "TEST BLURT!"
  var testBlurtContent2 = "TEST BLURT2!"
  var responseContent1 = "Test reply 1"
  var responseContent2 = "Test reply 2"
  var testBlurtResponse = "TEST response to blurt"
  var genericError = "Internal error. Likely bad request."

  //// Time for some tests ////

  it('can post a new user without a secret in the signature', function(done){
    superagent.post(api_url + 'Users')
      .send(signRequest({
        fingerprint: "0123456789"
      }))
      .end(function(e,res){
        // We expect not to have an error
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.success).to.eql(true)

        // Verify we have an id
        expect(res.body.id.length).to.eql(24)

        // Save off this id
        userId1 = res.body.id

        // Better have a secret
        expect(res.body.secret.length).to.eql(64)

        // Save off said secret, since we need it for every
        // single request from here on out
        secret1 = res.body.secret
        done()
      })
  })

  it('cannot post a new user without signing the request', function(done){
    superagent.post(api_url + 'Users')
      .send({
        fingerprint: "0912476235"
      })
      .end(function(e, res){
        // We expect nothing in e
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')

        // We expect success to equal false
        expect(res.body.success).to.eql(false)

        // We expect the reason to be "Invalid signature"
        expect(res.body.reason).to.eql("Invalid signature")
        done()
      })
  })

  it('cannot post a second time using the same fingerprint as the first', function(done){
    superagent.post(api_url + 'Users')
      .send(signRequest({
        fingerprint: "0123456789"
      }))
      .end(function(e,res){
        // We expect no errors
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')

        // We expect success to be false
        expect(res.body.success).to.eql(false)

        // We expect the reason to be ...
        expect(res.body.reason).to.eql(genericError)

        done()
      })
  })

  it('can create a new group', function(done){
    superagent.post(api_url + 'Groups')
      .send(signRequest({
        userId: userId1,
        name: testGroupName
      }, secret1))
      .end(function(e, res){
        // We expect not to have an error
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.success).to.eql(true)

        // We expect to have an id
        expect(res.body.id.length).to.eql(24)

        // Save it off for later
        groupId = res.body.id

        done()
      })
  })

  it('cannot create a second group with the same name', function(done){
    superagent.post(api_url + 'Groups')
      .send(signRequest({
        userId: userId1,
        name: testGroupName
      }, secret1))
      .end(function(e, res){
        // We expect not to have an error
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')

        // We expect success to be false
        expect(res.body.success).to.eql(false)

        // We expect the following reason
        expect(res.body.reason).to.eql(genericError)

        done()
      })    
  })

  it('can join a group', function(done){
    superagent.post(api_url + 'Groups/Join')
      .send(signRequest({
        userId: userId1,
        groupId: groupId
      }, secret1))
      .end(function(e, res){
        // We expect not to have an error
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.success).to.eql(true)

        done()
      })
  })

  it('cannot join a group a second time', function(done){
    superagent.post(api_url + 'Groups/Join')
      .send(signRequest({
        userId: userId1,
        groupId: groupId
      }, secret1))
      .end(function(e, res){
        // We expect not to have an error
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.success).to.eql(false)

        // We expect the message to be because this user is already a member
        expect(res.body.message).to.eql("User is already a member of this group")

        done()
      })
  })

  it('can receive a listing of groups in the system', function(done){
    superagent.get(api_url + 'Groups')
      .send(signRequest({
        userId: userId1,
        offset: 0
      }, secret1))
      .end(function(e, res){
        // We don't expect to have an error
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.success).to.eql(true)

        // Now, we expect a single element from the group we have created
        expect(typeof res.body.groups).to.eql('object')
        expect(res.body.groups.length).to.eql(1)
        expect(res.body.groups[0].name).to.eql(testGroupName)
        expect(res.body.groups[0].id).to.eql(groupId)
        expect(res.body.groups[0].isMember).to.eql(true)

        done()
      })
  })

  it('can post a new blurt globally', function(done){
    superagent.post(api_url + 'Blurts')
      .send(signRequest({
        userId: userId1,
        content: testBlurtContent,
        // omitting groupId
        requiresReply: true,
        isPublic: true
      }, secret1))
      .end(function(e, res){
        // We don't expect any issues
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.success).to.eql(true)

        // We expect a blurt id in response
        expect(res.body.id.length).to.eql(24)

        // Store off this id for later
        blurtId1 = res.body.id

        // Cool. Looks good.
        done()
      })
  })

  it('can post a new blurt directly to a group', function(done){
    superagent.post(api_url + 'Blurts')
      .send(signRequest({
        userId: userId1,
        content: testBlurtContent2,
        groupId: groupId,
        requiresReply: false,
        isPublic: true
      }, secret1))
      .end(function(e, res){
        // We don't expect any issues
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.success).to.eql(true)

        // We expect a blurt id in response
        expect(res.body.id.length).to.eql(24)

        // Store off this id for later
        blurtId2 = res.body.id

        // Cool. Looks perfect!
        done()
      })
  })

  it('cannot post a blurt to an invalid group', function(done){
    superagent.post(api_url + 'Blurts')
      .send(signRequest({
        userId: userId1,
        content: testBlurtContent2,
        groupId: userId1, // obviously not a valid group id
        requiresReply: false,
        isPublic: true
      }, secret1))
      .end(function(e, res){
        // We don't expect any exceptions
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')

        // We expect success to be false
        expect(res.body.success).to.eql(false)

        // We expect a particular message
        expect(res.body.message).to.eql("No group exists with id " + userId1)

        // Cool. Looks perfect!
        done()
      })
  })

  it('can allow a user to retrieve their own blurts with a beforeDate of 0 (so none)', function(done){
    superagent.get(api_url + 'Blurts')
      .send(signRequest({
        userId: userId1,
        beforeDate: 0,
      }, secret1))
      .end(function(e, res){
        // We don't expect any issues
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.success).to.eql(true)

        // We expect our blurt array to be empty
        expect(res.body.blurts.length).to.eql(0)

        done()
      })
  })

  it('can allow a user to retieve their own blurts from all time', function(done){
    superagent.get(api_url + 'Blurts')
      .send(signRequest({
        userId: userId1
      }, secret1))
      .end(function(e, res){
        // We don't expect any issues
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.success).to.eql(true)

        // We expect to have 2 blurts.
        expect(res.body.blurts.length).to.eql(2)

        // We expect the first to be the most recent
        expect(res.body.blurts[0].id).to.eql(blurtId2)
        expect(res.body.blurts[0].content).to.eql(testBlurtContent2)

        // We expect the send to be the original post
        expect(res.body.blurts[1].id).to.eql(blurtId1)
        expect(res.body.blurts[1].content).to.eql(testBlurtContent)

        done()
      })
  })

  it('can get a listing of public blurts globally', function(done){
    superagent.get(api_url + 'Blurts/Public')
      .send(signRequest({
        userId: userId1
      }, secret1))
      .end(function(e, res){
        // We don't expect any errors
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.success).to.eql(true)

        // We expect only one blurt that was the global one
        expect(res.body.blurts.length).to.eql(1)
        expect(res.body.blurts[0].id).to.eql(blurtId1)
        done()
      })
  })

  it('can get a listing of public blurts in a group', function(done){
    superagent.get(api_url + 'Blurts/Public')
      .send(signRequest({
        userId: userId1,
        groupId: groupId
      }, secret1))
      .end(function(e, res){
        // We don't expect any errors
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.success).to.eql(true)

        // We expect only one blurt that was the global one
        expect(res.body.blurts.length).to.eql(1)
        expect(res.body.blurts[0].id).to.eql(blurtId2)
        done()
      })
  })

  it('can get an empty listing of public blurts in a non-existant group', function(done){
    superagent.get(api_url + 'Blurts/Public')
      .send(signRequest({
        userId: userId1,
        groupId: userId1
      }, secret1))
      .end(function(e, res){
        // We don't expect any errors
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.success).to.eql(true)

        // We expect only one blurt that was the global one
        expect(res.body.blurts.length).to.eql(0)
        done()
      })
  })

  it('can fail to retrieve any blurts, since there are none available not created by this user', function(done){
    superagent.get(api_url + 'Blurts/Random')
      .send(signRequest({
        userId: userId1
      }, secret1))
      .end(function(e, res){
        // We don't expect any errors
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')

        // We expect success to be false, since there were none for us
        expect(res.body.success).to.eql(false)

        // We expect the reason to be "no new blurts ..."
        expect(res.body.reason).to.eql("No new blurts available at this time")

        done()
      })
  })

  it('can post a second new user without a secret in the signature', function(done){
    superagent.post(api_url + 'Users')
      .send(signRequest({
        fingerprint: "9876543210"
      }))
      .end(function(e,res){
        // We expect not to have an error
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.success).to.eql(true)

        // Verify we have an id
        expect(res.body.id.length).to.eql(24)

        // Save off this id
        userId2 = res.body.id

        // Better have a secret
        expect(res.body.secret.length).to.eql(64)

        // Save off said secret, since we need it for every
        // single request from here on out
        secret2 = res.body.secret
        done()
      })
  })

  it('can have a second user join a group', function(done){
    superagent.post(api_url + 'Groups/Join')
      .send(signRequest({
        userId: userId2,
        groupId: groupId
      }, secret2))
      .end(function(e, res){
        // We expect not to have an error
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.success).to.eql(true)

        done()
      })
  })

  it('can have the second user retrieve a random blurt', function(done){
    superagent.get(api_url + 'Blurts/Random')
      .send(signRequest({
        userId: userId2
      }, secret2))
      .end(function(e, res){
        // We don't expect any errors
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')

        // We expect success to be true
        expect(res.body.success).to.eql(true)

        // We expect this to be the first test blurt
        expect(res.body.id).to.eql(blurtId1)
        expect(res.body.content).to.eql(testBlurtContent)
        expect(res.body.requiresReply).to.eql(true)
        expect(res.body.isPublic).to.eql(true)

        done()
      })
  })

  it('fails to retrieve the same blurt twice for the second user', function(done){
    superagent.get(api_url + 'Blurts/Random')
      .send(signRequest({
        userId: userId2
      }, secret2))
      .end(function(e, res){
        // We don't expect any errors
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')

        // We expect success to be false since there are none
        expect(res.body.success).to.eql(false)

        // We expect the reason to be "no new blurts ..."
        expect(res.body.reason).to.eql("No new blurts available at this time")

        done()
      })
  })

  it('can have the second user retrieve a random blurt from a group', function(done){
    superagent.get(api_url + 'Blurts/Random')
      .send(signRequest({
        userId: userId2,
        groupId: groupId
      }, secret2))
      .end(function(e, res){
        // We don't expect any errors
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')

        // We expect success to be true
        expect(res.body.success).to.eql(true)

        // We expect this to be the first test blurt
        expect(res.body.id).to.eql(blurtId2)
        expect(res.body.content).to.eql(testBlurtContent2)
        expect(res.body.requiresReply).to.eql(false)
        expect(res.body.isPublic).to.eql(true)
        
        done()
      })
  })

  it('can have the second user reply to the global blurt', function(done){
    superagent.post(api_url + 'Blurts/Reply')
      .send(signRequest({
        userId: userId2,
        content: responseContent1,
        replyingToId: blurtId1
      }, secret2))
      .end(function(e, res){
        // We don't expect any errors
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')

        // We expect success to be true
        expect(res.body.success).to.eql(true)

        // We expect to get a blurt id
        expect(res.body.id.length).to.eql(24)

        // Store it off
        replyId1 = res.body.id
        
        done()
      })
  })

  it('does not allow the first user to reply to their own blurt', function(done){
    superagent.post(api_url + 'Blurts/Reply')
      .send(signRequest({
        userId: userId1,
        content: responseContent2,
        replyingToId: blurtId2
      }, secret1))
      .end(function(e, res){
        // We don't expect any errors
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')

        // We do expect a false success
        expect(res.body.success).to.eql(false)

        // We expect the message to be user not assigned
        expect(res.body.message).to.eql("User not allowed to reply to this blurt. They are not assigned.")

        done()
      })    
  })

  it('can have the first user retrieve their replies', function(done){
    superagent.get(api_url + 'Blurts/Replies')
      .send(signRequest({
        userId: userId1
      }, secret1))
      .end(function(e, res){
        // We don't expect any errors
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')

        // We expect success to be true
        expect(res.body.success).to.eql(true)

        // We expect one blurt
        expect(res.body.blurts.length).to.eql(1)

        // We expect it to be the first blurt
        expect(res.body.blurts[0].content).to.eql(responseContent1)

        done()
      })
  })

  it('can have the second user reply to the group blurt', function(done){
    superagent.post(api_url + 'Blurts/Reply')
      .send(signRequest({
        userId: userId2,
        content: responseContent2,
        replyingToId: blurtId2
      }, secret2))
      .end(function(e, res){
        // We don't expect any errors
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')

        // We expect success to be true
        expect(res.body.success).to.eql(true)

        // We expect to get a blurt id
        expect(res.body.id.length).to.eql(24)

        // Store it off
        replyId2 = res.body.id
        
        done()
      })
  })

  it('again can have the first user retrieve their replies, now getting 2', function(done){
    // todo
    done()
  })

  //// Cleanup  work! ////
  after(function(done){

    // Use mongoose to remove all users, groups, and blurts
    User.find({}).remove().exec()
    Group.find({}).remove().exec()
    Blurt.find({}).remove().exec()

    User.find({}, function(err, users){
      expect(users).to.eql(null)
    })

    done()
  })
})