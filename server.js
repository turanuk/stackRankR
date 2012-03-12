var express = require('express');
var dal = require("./dal/dataAccessLayer.js");

var app = module.exports = express.createServer();

/**
* CONFIGURATION
* -------------------------------------------------------------------------------------------------
* set up view engine (jade), css preprocessor (less), and any custom middleware (errorHandler)
**/
app.configure(function() {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(require('./middleware/locals'));
    app.use(express.cookieParser());
    app.use(express.static(__dirname + '/public'));
    app.use(app.router);
});

/**
* ROUTING
* -------------------------------------------------------------------------------------------------
* include a route file for each major area of functionality in the site
**/
require('./routes/home')(app);
require('./routes/dal')(app, dal);
app.listen(process.env.PORT || 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);