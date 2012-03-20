var path = require('path');

/**
 * this piece of middleware adds a variable named 'base' to the model
 * that always refers to the location of the base uri for the application
 **/
module.exports = function(req, res, next) {
  var app = req.app;

  // set base var
  res.local('base', '/' == app.route ? '' : app.route);
    
  // allow the next piece of middleware to execute
  next();
};