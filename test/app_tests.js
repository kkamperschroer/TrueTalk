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
  var blurt2Id
  var testGroupName = "Test Group Name!"
  var testBlurtContent = "TEST BLURT!"
  var testBlurtContent2 = "TEST BLURT2!"
  var testBlurtResponse = "TEST response to blurt"

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
        expect(res.body.reason).to.eql("Internal error. Duplicate key?")

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
        expect(res.body.reason).to.eql("Internal error. Duplicate key?")

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

        // Cool. Looks good.
        done()
      })
  })

/**
  it('retrieve a user by fingerprint', function(done){
    superagent.get(api_url + 'Users/' + fingerprint)
      .end(function(e, res){
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body._id.length).to.eql(24)
        expect(res.body.fingerprint).to.eql(fingerprint)
        done()
      })
  })

  it('can post a second user', function(done){
    superagent.post(api_url + 'Users')
      .send({
        id: fingerprint2
      })
      .end(function(e,res){
        // We expect not to have an error
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body._id.length).to.eql(24)
        expect(res.body.secret.length).to.eql(64)
        done()
      })
  })

  it('can get a listing of both users', function(done){
    superagent.get(api_url + 'Users')
      .end(function(e, res){
        // Don't expect an error
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.length).to.eql(2)
        expect(typeof res.body[0]).to.eql('object')
        expect(typeof res.body[1]).to.eql('object')
        expect(res.body[0].fingerprint).to.eql(fingerprint)
        expect(res.body[1].fingerprint).to.eql(fingerprint2)
        done()
      })
  })

  it('can create a group', function(done){
    superagent.post(api_url + 'Groups')
      .send({
        name: testGroupName,
        fingerprint: fingerprint
      })
      .end(function(e, res){
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.name).to.eql(testGroupName)
        expect(res.body.createdDate).to.not.eql(null)
        expect(res.body.userIds.length).to.eql(1)
        expect(res.body.userIds[0].length).to.eql(24)
        groupId = res.body._id;
        done()
      })
  })

  it('sets the user creator to be a member of the group', function(done){
    superagent.get(api_url + 'Users/' + fingerprint)
      .end(function(e, res){
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.fingerprint).to.eql(fingerprint)
        expect(typeof res.body.groups).to.eql('object')
        expect(res.body.groups.length).to.eql(1)
        expect(res.body.groups[0]).to.eql(groupId)
        done()
      })
  })

  it('can get a listing of groups', function(done){
    superagent.get(api_url + 'Groups')
      .end(function(e, res){
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.length).to.eql(1)
        expect(res.body[0].userIds.length).to.eql(1)
        expect(res.body[0].userIds[0].length).to.eql(24)
        done()
      })
  })

  it('allows a user to post a blurt without a group', function(done){
    superagent.post(api_url + 'Blurts')
      .send({
        content: testBlurtContent,
        fingerprint: fingerprint
      })
      .end(function(e, res){
        // no errors
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body._id.length).to.eql(24)

        // get the id
        blurtId = res.body._id;

        // Verify all components are as expected
        expect(res.body.creatorId).to.not.eql(null)
        expect(res.body._id.length).to.eql(24)
        expect(res.body.groupId).to.eql(undefined)
        expect(res.body.content).to.eql(testBlurtContent)
        expect(res.body.replyingId).to.eql(undefined)
        expect(res.body.requiresResponse).to.eql(false)
        expect(res.body.isReply).to.eql(false)
        expect(res.body.flagged).to.eql(false)
        done()
      })
  })

  it('fails to post a new blurt when the fingerprint is invalid', function(done){
    superagent.post(api_url + 'Blurts')
      .send({
        content: testBlurtContent,
        fingerprint: "i made this up"
      })
      .end(function(e, res){
        expect(e).to.eql(null)
        expect(res.body.success).to.eql(false)
        done()
      })
  })

  it('fails to post a new blurt with invalid group id', function(done){
    superagent.post(api_url + 'Blurts')
      .send({
        content: testBlurtContent,
        fingerprint: fingerprint,
        groupId: "012345678901234567890123"
      })
      .end(function(e, res){
        expect(e).to.eql(null)
        expect(res.body.success).to.eql(false)
        done()
      })
  })

  it('allows a blurt to be posted to a single group', function(done){
    superagent.post(api_url + 'Blurts')
      .send({
        content: testBlurtContent2,
        fingerprint: fingerprint,
        groupId: groupId,
        requiresResponse: true
      })
      .end(function(e, res){
        expect(e).to.eql(null)
        expect(res.body.groupId).to.eql(groupId)
        expect(res.body.creatorId.length).to.eql(24)
        expect(res.body._id.length).to.eql(24)
        var blurt2Id = res.body._id
        done()
      })
  })

  it('prevents a user from receiving their own global blurt', function(done){
    superagent.get(api_url + 'Blurts/Gimme')
      .send({
        fingerprint: fingerprint
      })
      .end(function(e, res){
        expect(e).to.eql(null)
        expect(res.body.msg).to.not.eql(null)
        expect(res.body.msg).to.eql("No new blurts")
        done()
      })
  })

  it('prevents a user from receiving their own group blurt', function(done){
    superagent.get(api_url + 'Blurts/Gimme')
      .send({
        fingerprint: fingerprint,
        groupId: groupId
      })
      .end(function(e, res){
        expect(e).to.eql(null)
        expect(res.body.msg).to.not.eql(null)
        expect(res.body.msg).to.eql("No new blurts")
        done()
      })
  })

  it('allows a second user to receive a global blurt', function(done){
    superagent.get(api_url + 'Blurts/Gimme')
      .send({
        fingerprint: fingerprint2
      })
      .end(function(e, res){
        expect(e).to.eql(null)
        expect(res.body._id.length).to.eql(24)
        expect(res.body.requiresResponse).to.eql(false)
        expect(res.body.timeout).to.eql(undefined)
        expect(res.body.content).to.eql(testBlurtContent)
        expect(res.body.groupId).to.eql(undefined)
        done()
      })
  })

  it('allows a second user to receive a blurt from a group', function(done){
    superagent.get(api_url + 'Blurts/Gimme')
      .send({
        fingerprint: fingerprint2,
        groupId: groupId
      })
      .end(function(e, res){
        expect(e).to.eql(null)
        expect(res.body._id.length).to.eql(24)
        expect(res.body.requiresResponse).to.eql(true)
        expect(res.body.timeout).to.not.eql(undefined)
        expect(res.body.content).to.eql(testBlurtContent2)
        expect(res.body.groupId).to.eql(groupId)
        done()
      })
  })

  it('allows a user to get a listing of their blurts', function(done){
    superagent.get(api_url + 'Blurts/Mine')
      .send({
        fingerprint: fingerprint
      })
      .end(function(e, res){
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.length).to.eql(2)
        expect(res.body[0].groupId).to.eql(undefined)
        expect(res.body[0].content).to.eql(testBlurtContent)
        expect(res.body[0].requiresResponse).to.eql(false)
        expect(res.body[1].groupId).to.eql(groupId)
        expect(res.body[1].content).to.eql(testBlurtContent2)
        expect(res.body[1].requiresResponse).to.eql(true)
        // Haven't received a response
        expect(res.body[1].replyingId).to.eql(undefined)
        done()
      })
  })

  it('allows a second user to respond to a blurt', function(done){
    superagent.post(api_url + 'Blurts')
      .send({
        content: testBlurtResponse,
        fingerprint: fingerprint2,
        groupId: groupId,
        isReply: true,
        isReplyTo: blurt2Id
      })
      .end(function(e, res){
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.isReply).to.eql(true)
        expect(res.body.isReplyTo).to.eql(blurt2Id)
        expect(res.body.content).to.eql(testBlurtResponse)
        done()
      })
  })

  it('allows the first user to obtain responses', function(done){
    superagent.get(api_url + 'Blurts/Responses')
      .send({
        fingerprint: fingerprint
      })
      .end(function(e, res){
        console.log(res.body)
        expect(e).to.eql(null)

        done()
      })
  })

  /// Cleanup ///

  it('can remove a user by fingerprint', function(done){
    superagent.del(api_url + 'Users/'+fingerprint)
      .end(function(e, res){
        // console.log(res.body)
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.msg).to.eql('success')
        done()
      })
  })

  it('can remove a second user by fingerprint', function(done){
    superagent.del(api_url + 'Users/'+fingerprint2)
      .end(function(e, res){
        // console.log(res.body)
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.msg).to.eql('success')
        done()
      })
  })

  it('can delete a group by id', function(done){
    superagent.del(api_url + 'Groups/' + groupId)
      .end(function(e, res){
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.msg).to.eql('success')
        done()
      })
  })

**/

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