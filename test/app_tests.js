var superagent = require('superagent')
var expect = require('expect.js')

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
  var groupId; // to be set when created group

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
        userFingerprint: fingerprint
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

  /**

  it('cannot post a blurt with invalid fingerprint', function(done){
    superagent.post(api_url + 'Blurts')
      .end(function(e, res){
        expect(e).to.not.eql(null)
        done()
      })
  })

  it('can post a blurt from one user', function(done){
    superagent.post(api_url + 'Blurts')
      .end(function(e, res){
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')

      })
  })
/**
  it('retrieves a collection', function(done){
    superagent.get('http://localhost:3000/collections/test')
      .end(function(e, res){
        // console.log(res.body)
        expect(e).to.eql(null)
        expect(res.body.length).to.be.above(0)
        expect(res.body.map(function (item){return item._id})).to.contain(id)
        done()
      })
  })

  it('updates an object', function(done){
    superagent.put('http://localhost:3000/collections/test/'+id)
      .send({name: 'Peter'
        , email: 'peter@yahoo.com'})
      .end(function(e, res){
        // console.log(res.body)
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.msg).to.eql('success')
        done()
      })
  })

  it('checks an updated object', function(done){
    superagent.get('http://localhost:3000/collections/test/'+id)
      .end(function(e, res){
        // console.log(res.body)
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body._id.length).to.eql(24)
        expect(res.body._id).to.eql(id)
        expect(res.body.name).to.eql('Peter')
        done()
      })
  })

  **/

  it('can remove a user by fingerprint', function(done){
    superagent.del('http://localhost:3000/Users/'+fingerprint)
      .end(function(e, res){
        // console.log(res.body)
        expect(e).to.eql(null)
        expect(typeof res.body).to.eql('object')
        expect(res.body.msg).to.eql('success')
        done()
      })
  })

  it('can remove a second user by fingerprint', function(done){
    superagent.del('http://localhost:3000/Users/'+fingerprint2)
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

})