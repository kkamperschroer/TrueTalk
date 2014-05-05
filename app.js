// Get the db ready 
require('./db.js');

var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

// Get the routes for each portion set up
var routes = require('./routes/index');
var users = require('./routes/users');
var groups = require('./routes/groups');
var blurts = require('./routes/blurts');

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

// Finalize the route setup
app.use('/', routes);
app.use('/users', users);
app.use('/blurts', blurts);
app.use('/groups', groups);

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
        message: err.message,
        error: {}
    });
});


module.exports = app;
