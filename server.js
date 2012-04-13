var express = require('express');
var dal = require("./dal/dataAccessLayer.js");
var everyauth = require('everyauth');
var MemoryStore = express.session.MemoryStore;
var sessionStore = new MemoryStore();
var Session = require('connect').middleware.session.Session;
var app = module.exports = express.createServer();
everyauth.helpExpress(app);
var redis = require('redis');
var RedisStore = require('socket.io/lib/stores/redis');
var parseCookie = require('connect').utils.parseCookie;
var socketIo = require('socket.io').listen(app);

//
/**
* REDIS
* -------------------------------------------------------------------------------------------------
**/
var redisUrl = process.env.REDISTOGO_URL;
//Parse the redis environment variable
//Format: redis://identifier:key@host:port

var host, port, key;

if (redisUrl) {
  var secondpart = redisUrl.split('@').pop().split(':');
  host = secondpart[0];
  console.log(host);
  port = secondpart[1].split('/')[0];
  console.log(port);
  key = redisUrl.split(':')[2].split('@')[0];
  console.log(key);
}

//Option for no ready check needed, otherwise the ready check fails with auth and the process dies out
var options = { no_ready_check: true };

var pub = redis.createClient(port, host, options);
pub.on('error', function (err) { console.log (err); });
pub.auth(key, function () {
  var sub = redis.createClient(port, host, options);
  sub.on('error', function (err) { console.log (err); });
  sub.auth(key, function() {
    var store = redis.createClient(port, host, options);
    store.on('error', function (err) { console.log (err); });
    store.on('ready', function() {
      socketIoSetup(pub, sub, store);
    });
    store.auth(key, function() {});
  });
});
/** End REDIS **/


/**
* AUTHENTICATION
* -------------------------------------------------------------------------------------------------
* set up authentication using Twitter and Azure ACS
**/
everyauth.twitter
  .consumerKey(process.env.twitterKey)
  .consumerSecret(process.env.twitterSecret)
  .callbackPath('/custom/twitter/callback/path')
  .findOrCreateUser(function (session, accessToken, accessTokenSecret, twitterUserMetadata) {
    dal.findOrCreateUser(twitterUserMetadata);
    return twitterUserMetadata;
  })
  .redirectPath('/');

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
    app.use(express.session({secret: 'mysecret', store: sessionStore, key: 'express.sid' }));
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

//
/**
* SOCKET.IO
* -------------------------------------------------------------------------------------------------
**/
socketIo.configure(function() {
  socketIo.set('transports', ['xhr-polling']);
  socketIo.set('polling duration', 100);
  //Need to add session information to the socket.io request
  socketIo.set('authorization', function (handshake, callback) {
    if (handshake.headers.cookie) {
      handshake.cookie = parseCookie(handshake.headers.cookie);
      handshake.sessionId = handshake.cookie['express.sid'];
      handshake.sessionStore = sessionStore;
      sessionStore.get(handshake.sessionId, function (err, session) {
        if (err || !session) {
          callback('Error', false)
        } else {
          handshake.session = new Session(handshake, session);
          callback(null, true);
        }
      });
    } else {
      callback('No cookie', false);
    }
  });
});

var socketIoSetup = function (pub, sub, store) {
  socketIo.set('store', new RedisStore({ redisPub: pub, redisSub: sub, redisClient: store}));
}

socketIo.sockets.on('connection', function (socket) {
    console.log('socketIO: connected socket id: ' + socket.id);

    //Challenge for user to identify themselves once they connect to a team
    socket.emit('identifyUser');

    //Store a user connection in a look-up table (user identifies themselves)
    socket.on('userConnected', function (incoming) {
      //Join a channel for the teamId
      socket.join(incoming.teamId);
      socket.team = incoming.teamId;
    });

    //Clean up user once they disconnect
    socket.on('disconnect', function () {
      console.log('socketIo: Disconnected socket id: ' + socket.id);
      socket.leave(socket.team);
    });

    //When the data changes we need to update others viewing the team
    socket.on('dataChanged', function (data) {
      console.log('socketIo: Data changed');
      //Get team data from db and broadcast to users looking at the team
      var userId = socket.handshake.session.auth.twitter.user.id;
      console.log('socketIo: userId: ' + userId + ', teamId:' + data.teamId);
      dal.getTeamRedis(userId, data.teamId, function (team) {
        console.log('socketIo: team' + team);
        socket.broadcast.to(data.teamId).json.send(team);
      });
    })
  });
/** End SOCKET.IO **/

/**
* ROUTING
* -------------------------------------------------------------------------------------------------
* include a route file for each major area of functionality in the site
**/
require('./routes/home')(app, authenticatedUser, authorizedUser);
require('./routes/dal')(app, dal, authenticatedUser);
app.listen(process.env.PORT || 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);