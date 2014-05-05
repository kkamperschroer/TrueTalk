// Responsible for setting up the database and schema objects

// Require mongoose
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/TrueTalk');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: '));

// Get the models
require('./models/user.js');
require('./models/group.js');
require('./models/blurt.js');
