var express = require('express');
var router = express.Router();

/* GET blurts listing json. */
router.get('/blurts', function(req, res) {
    // TODO -- Validate request and filter
    var db = req.db;
    db.collection('blurtcollection').find().toArray(function (err, items){
        res.json(items);
    });
});

/* GET specific blurt */
router.get('/blurts/:id', function(req, res) {
    // TODO -- Validate request parameters
    

    var db = req.db;
    db.collection('blurtcollection').find().toArray(function (err, items){
        res.json(items);
    });
});

/* GET random blurt */


module.exports = router;
