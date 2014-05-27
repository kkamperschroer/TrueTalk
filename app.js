// Get the db ready 
require('./db.js');

var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

// Get the routes for each portion set up
var authRoute = require('./routes/auth');
var indexRoute = require('./routes/index');
var usersRoute = require('./routes/users');
var groupsRoute = require('./routes/groups');
var blurtsRoute = require('./routes/blurts');

// Build the app! Go express!
var app = express();

// view engine setup (express generated)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Setup the index route
app.use('/', indexRoute);

// Setup the auth route
app.use('/*', authRoute);

// Finalize the route setup for every other portion
app.use('/Users', usersRoute);
app.use('/Blurts', blurtsRoute);
app.use('/Groups', groupsRoute);

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.send({
            success: false,
            reason: "Internal error. Likely bad request.",
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send({
        success: false,
        reason: "Internal error. Likely bad request."
    });
});


module.exports = app;
