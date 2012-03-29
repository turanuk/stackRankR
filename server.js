var express = require('express');
var dal = require("./dal/dataAccessLayer.js");
var everyauth = require('everyauth');

var app = module.exports = express.createServer();
everyauth.helpExpress(app);

/**
* SOCKET.IO
* -------------------------------------------------------------------------------------------------
**/
var socketIo = require('socket.io').listen(app);
var redis = require('redis'),
    redisSubscribeClient = redis.createClient(),
    redisPublishClient = redis.createClient();

redisSubscribeClient.on('error', function (err) {
    console.log('Redis: Subscribe client error ' + err);
});

redisPublishClient.on('error', function (err) {
    console.log('Redis: Publish client error ' + err);
});


var connectedUsers = {};

socketIo.set('log level', 1);

socketIo.sockets.on('connection', function (socket) {
  console.log('Socket.IO: Client connected...');

  //Challenge for user to identify themselves once they connect to a team
  socket.emit('identifyUser');

  //Store a user connection in a look-up table (user identifies themselves)
  socket.on('userConnected', function (incoming) {
    if (!connectedUsers[incoming.teamId]) {
      connectedUsers[incoming.teamId] = new Array();
    }
    connectedUsers[incoming.teamId].push(socket.id);
    console.log('stored socket id of ' + socket.id);
  });

  //Clean up user once they disconnect
  socket.on('disconnect', function () {
    console.log('disconnected' + socket.id);
    //TODO: Remove the socket id from the array of connected users
  });

  // if we drive the sync process from the server on "team save" then I
  // don't think we need this code b/c we can do the emit the 'sync' operation
  // from there
  socket.on('dataChanged', function (data) {
    console.log('Socket.IO: Data has changed. Syncing to clients...');
    //Create sub if not created (idempotent call)
    redisSubscribeClient.subscribe(data.teamId);
    //Get team data from db (hardcode username)
    dal.getTeamRedis('15250013', data.teamId, function (team) {
      //Publish to redis sub
      redisPublishClient.publish(data.teamId, team);
    });
  })

  //Redis: on a publish operation, call socket.send to send down teamId to the client - client will just do a call
  //to the DAL endpoint in v0.1
  redisSubscribeClient.on('message', function (subscription, message) {
    console.log('Redis: Subscribe client received message for subscription ' + subscription);
    socket.emit('updateAvailable', message);
  });
});

/** End SOCKET.IO **/

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
  .consumerKey('YgN2ffzZ6sunKxT9gs3w')
  .consumerSecret('4kE6jar9UExNdcirehEt1j6iwhfFHKfDtPfNy5rE')
  .callbackPath('/custom/twitter/callback/path')
  .findOrCreateUser(function (session, accessToken, accessTokenSecret, twitterUserMetadata) {
    dal.findOrCreateUser(twitterUserMetadata);
    return twitterUserMetadata;
  })
  .redirectPath('/')

everyauth.facebook
  .appId('')
  .appSecret('')
  .callbackPath('/auth/facebook/callback')
  .scope('email')
  .findOrCreateUser(function (session, accessToken, accessTokenExtra, facebookUserMetadata) {
    return facebookUserMetadata;
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

//authorization middleware (twitter specific)
var authorizedUser = function (req, res, next) {
  if (req.session.auth.loggedIn && req.session.auth.twitter && (req.session.auth.twitter.user.id == req.params.userid)) {
    next();
  } else {
    res.render('autherror');
  }
}

/**
* ROUTING
* -------------------------------------------------------------------------------------------------
* include a route file for each major area of functionality in the site
**/
require('./routes/home')(app, authenticatedUser, authorizedUser);
require('./routes/dal')(app, dal, authenticatedUser);
app.listen(process.env.PORT || 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);