var superagent = require('superagent')
var expect = require('expect.js')
var mongoose = require('mongoose')
require('../db.js')
var User = mongoose.model('User')
var Group = mongoose.model('Group')
var Blurt = mongoose.model('Blurt')

/**
// TODO -- This work
// Helper function for signing
var crypto = require('crypto.js')
function signRequest(request, secret){
  var builtStr = "so salty";
  for (var key in request){
    builtStr += request[key];
  }

  // Build the signature
  signature = crypto
    .createHash("sha256")
    .update(builtStr + secret).digest("hex")

  // Add it to the object
  request["signature"] = signature;

  return request;
}
**/

describe('TrueTalk api server', function(){
  var api_url = "http://localhost:3000/";
  var fingerprint = "0123456789";
  var fingerprint2 = "9876543210";
  var testGroupName = "Test Group Name!";
  var testBlurtContent = "TEST BLURT!"
  var testBlurtContent2 = "TEST BLURT2!"
  var testBlurtResponse = "TEST response to blurt"
  // to be set later
  var groupId; 
  var blurt2Id;

  // TODO -- deal with secrets
  var secret1;
  var secret2;

  it('can post a new user without signature', function(done){
    superagent.post(api_url + 'Users')
      .send({
        id: fingerprint
      })
      .end(function(e,res){
        // We expect not to have an error
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body._id.length).to.eql(24)

        // Better have a secret
        expect(res.body.secret.length).to.eql(64)
        done()
      })
  })

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
    // you left off here
    done()
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