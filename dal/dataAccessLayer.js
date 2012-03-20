var exports = module.exports;

var mongo = require('mongodb'),
  Server = mongo.Server,
  Db = mongo.Db;

var async = require('async');

var dataTableName = 'teams';  // single table where we're storing all of the data
var membershipTableName = 'membership';
var singleDataIdentifier = '1'; // only storing one piece of data in the database; we'll identify it w/ this value

var mongoLabUri = (process.env.MONGOLAB_URI || false);

if (mongoLabUri) {
  var runningInProduction = true;

  // trim off the 'mongodb://' piece
  mongoLabUri = mongoLabUri.substring(10);

  // get the username for connecting to db
  var indexOfUsernameColonDelimiter = mongoLabUri.indexOf(':');
  var databaseUser = mongoLabUri.substring(0, indexOfUsernameColonDelimiter);
  mongoLabUri = mongoLabUri.substring(databaseUser.length + 1);

  // get the password for connecting to db
  var indexOfPasswordDelimiter = mongoLabUri.indexOf('@');
  var databaseUserPassword = mongoLabUri.substring(0, indexOfPasswordDelimiter);
  mongoLabUri = mongoLabUri.substring(databaseUserPassword.length + 1);

  // get the db server name
  var indexOfDbServerDelimiter = mongoLabUri.indexOf(':');
  var databaseServer = mongoLabUri.substring(0, indexOfDbServerDelimiter);
  mongoLabUri = mongoLabUri.substring(databaseServer.length + 1);

  // get the db server port
  var indexOfDbServerPortDelimiter = mongoLabUri.indexOf('/');
  var databaseServerPort = mongoLabUri.substring(0, indexOfDbServerPortDelimiter);
  mongoLabUri = mongoLabUri.substring(databaseServerPort.length + 1);
  databaseServerPort = parseInt(databaseServerPort);  // mongodb driver requires port to be an int

  // get the database name
  var databaseName = mongoLabUri;
} else {
  var runningInProduction = false;
  var databaseServer = 'localhost';
  var databaseServerPort = 27017;
  var databaseName = 'stackRankR';
}

var testData =
  { 
    "TeamId": singleDataIdentifier,
    "teamName": "DEX"
    ,
    "rankings": [
      {
        "_id": "r1",
        "rankingName": "Best",
        "people": [
          {
            "_id": "p1",
            "name": "Bob"
          },
          {
            "_id": "p2",
            "name": "Larry"
          }
        ]
      },
      {
        "_id": "r2",
        "rankingName": "Worst",
        "people": [
          {
            "_id": "p3",
            "name": "Bob Jr."
          },
          {
            "_id": "p4",
            "name": "Larry Jr."
          }
        ]
      }
    ]
  };

var openDb = function(callback) {
  console.log('Preparing to open connection to database server...');

  console.log('Server: ' + databaseServer);
  console.log('Server port: ' + databaseServerPort);
  console.log('Database name: ' + databaseName);

  var server = new Server(databaseServer, databaseServerPort, {auto_reconnect: true});

  var db = new Db(databaseName, server);

  console.log('Opening connection to database server...');

  db.open(function(err, db) {
    if (!err) {
      console.log('Connection to database server succeeded!');

      if (runningInProduction) {
        db.authenticate(databaseUser, databaseUserPassword, function(err, result) {
          if (!err) {
            // create the collection; if it already exists, no-op
            // TODO: move this out of here so it's not invoked on every call!
            db.createCollection(dataTableName, function(err, collection) {
              if (!err) {
                callback(null, db);             
              } else {
                callback(err, db);
              }
            });
          } else {
            console.log('Database authentication failed');
            callback(err, db);
          }
          });
      } else {
        db.createCollection(dataTableName, function(err, collection) {
          if (!err) {
            callback(null, db);
          } else {
            callback(err, db);
          }
        });
      }
    } else {
      console.log('Connection to db FAILED!');

      callback(err, db);
    }
  });
}

//Used to find user
exports.findOrCreateUser = function (user) {
  async.waterfall([
    function (callback) {
      openDb(callback);
    },
    function (db, callback) {
      db.collection(membershipTableName, function (err, collection) {
        collection.findOne({ 'id': user.id }, function (err, item) {
          if (!err) {
            if (!item) {
              console.log('Did not find user, creating new');
              collection.insert(user);
              item = user;
            } else { 
              console.log('Found user');
            }
            collection.ensureIndex({ 'id': user.id });
            callback(null, db, item);
          } else {
            callback(err, db);
          }
        });
      });
    }
  ], function (err, db, item) {
    if (db && db.close) {
      db.close();
    }
    if (err) {
      console.log('Something went wrong with finding the user!');
      console.log(err);
    } else {
      return item;
    }
  });
};

exports.getData = function(response) {
  async.waterfall([
      function(callback) {
        openDb(callback);
    },

      // get the board
      function(db, callback) {
      console.log('Trying to get the data');

      db.collection(dataTableName, function(err, collection) {
        collection.findOne({ "TeamId": singleDataIdentifier }, function(err, item) {
          if (!err) {
            if (item == null) {
              console.log('Did NOT find the data.');
            } else {
              console.log('Found the data.');

              response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
              // convert from a JSON object to a string
              response.write(JSON.stringify(item));
            }

                callback(null, db);
          } else {
            callback(err, db);
          }
        });
      });
      }    
  ], function (err, db) {
    // all done
    if (db && db.close) {
      db.close();
    }

    if (err) {
      console.log('Something went wrong with getting the data!');
      console.log(err);

      response.writeHead(404, { "Content-Type": "text/plain" });
    }

    response.end();
  });
};

exports.saveData = function(data, response) {
  async.waterfall([
    function(callback) {
        openDb(callback);
    },

      // save the board
      function(db, callback) {
        console.log('Saving the data.');

        saveDataInternal(db, data, callback);
      }
  ], function (err, db) {
    // all done
    if (db && db.close) {
      db.close();
    }

    if (err) {
      console.log('Something went wrong with saving the data!');
      console.log(err);

      response.writeHead(500, { "Content-Type": "text/plain" });
    } else {
      response.writeHead(200, { "Content-Type": "text/plain" });
    }

    response.end();
  });
};

var saveDataInternal = function(db, data, callback) {
  console.log('Saving data...');

  // for now, we'll just out the board and re-add it; no partial updates
  db.collection(dataTableName, function(err, collection) {
    collection.findOne({ "TeamId": singleDataIdentifier }, function(err, item) {
      if (!err) {
        if (item == null) {
          console.log("Seeing the data for the first time, saving it.");

          collection.insert(data);
        } else {
          collection.remove({ "TeamId": singleDataIdentifier });
          collection.insert(data);
        }

        // create index; if exists, no-op
        // we have to do this *after* a document is first inserted
        collection.ensureIndex({ "TeamId": singleDataIdentifier });

        console.log('Data saved.');

        callback(null, db);
      } else {
        console.log("Unable to retrieve data. Save failed.");

        callback(err, db);
      }
    });
  });
}