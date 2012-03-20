var express = require('express');
var dal = require("./dal/dataAccessLayer.js");
var everyauth = require('everyauth');

var app = module.exports = express.createServer();
everyauth.helpExpress(app);

/**
* AUTHENTICATION
* -------------------------------------------------------------------------------------------------
* set up basic authentication
**/
var usersById = {};
var nextUserId = 0;

function addUser (source, sourceUser) {
  var user;
  if (arguments.length === 1) { // password-based
    user = sourceUser = source;
    user.id = ++nextUserId;
    return usersById[nextUserId] = user;
  } else { // non-password-based
    user = usersById[++nextUserId] = {id: nextUserId};
    user[source] = sourceUser;
  }
  return user;
}

var usersByLogin = {
    'stackrankr': addUser({login: 'stackrankr', password: 'stackrankr'})
  };

everyauth
  .password
    .loginWith('email')
    .getLoginPath('/login')
    .postLoginPath('/login')
    .loginView('login.jade')
    .loginLocals( function (req, res, done) {
      setTimeout( function () {
        done(null, {
          title: 'Login'
        });
      }, 200);
    })
    .authenticate( function (login, password) {
      var errors = [];
      if (!login) errors.push('Missing login');
      if (!password) errors.push('Missing password');
      if (errors.length) return errors;
      var user = usersByLogin[login];
      if (!user) return ['Login failed'];
      if (user.password !== password) return ['Login failed'];
      return user;
    })

    .getRegisterPath('/register')
    .postRegisterPath('/register')
    .registerView('register.jade')
//    .registerLocals({
//      title: 'Register'
//    })
//    .registerLocals(function (req, res) {
//      return {
//        title: 'Sync Register'
//      }
//    })
    .registerLocals( function (req, res, done) {
      setTimeout( function () {
        done(null, {
          title: 'Async Register'
        });
      }, 200);
    })
    .validateRegistration( function (newUserAttrs, errors) {
      var login = newUserAttrs.login;
      if (usersByLogin[login]) errors.push('Login already taken');
      return errors;
    })
    .registerUser( function (newUserAttrs) {
      var login = newUserAttrs[this.loginKey()];
      return usersByLogin[login] = addUser(newUserAttrs);
    })

    .loginSuccessRedirect('/')
    .registerSuccessRedirect('/');

everyauth.twitter
  .consumerKey('')
  .consumerSecret('')
  .callbackPath('/custom/twitter/callback/path')
  .findOrCreateUser( function (session, accessToken, accessTokenSecret, twitterUserMetadata) {
      dal.findOrCreateUser(twitterUserMetadata);
      return twitterUserMetadata;
  })
  .redirectPath('/')

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
    app.use(express.session({secret: 'mysecret'}));
    app.use(everyauth.middleware());
    app.use(app.router);
});

//authentication middleware
var authenticatedUser = function (req, res, next) {
  if (req.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
}

/**
* ROUTING
* -------------------------------------------------------------------------------------------------
* include a route file for each major area of functionality in the site
**/
require('./routes/home')(app, authenticatedUser);
require('./routes/dal')(app, dal, authenticatedUser);
app.listen(process.env.PORT || 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);