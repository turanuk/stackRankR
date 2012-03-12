var mongo = require('mongodb'),
  Server = mongo.Server,
  Db = mongo.Db;

var async = require('async');

var databaseName = "stackRankR";
var dataTableName = "boards";	// single table where we're storing all of the data
var singleDataIdentifier = 1;	// only storing one piece of data in the database; we'll identify it w/ this value

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
	var server = new Server('localhost', 27017, {auto_reconnect: true});
	var db = new Db(databaseName, server);

	db.open(function(err, db) {
		if (!err) {
			console.log('Connection to db succeeded!');

			// create the collection; if it already exists, no-op
			// TODO: move this out of here so it's not invoked on every call!
			db.createCollection(dataTableName, function(err, collection) {				
			});

			callback(null, db);
		} else {
			console.log('Connection to db FAILED!');

			callback(err);
		}
	});
}

var getData = function(response) {
	async.waterfall([
		// open db
	    function(callback) {
	    	openDb(callback);
		},

	    // get the board
	    function(db, callback) {
	    	db.collection(dataTableName, function(err, collection) {
				collection.findOne({ "TeamId": singleDataIdentifier }, function(err, item) {
					if (item == null) {
						console.log('Did NOT find the data.');
					} else {
						console.log('Found the data.');
					}

					response.writeHead(200, { "Content-Type": "application/json" });
					// convert from a JSON object to a string
					response.write(JSON.stringify(item));
					response.end();

					db.close();
				});
			});

	    	// and we're done
	        callback(null);
	    }	    
	], function (err, result) {
		// all done
		if (err) {
			console.log('Something went wrong with getting the data!')

			response.writeHead(404, { "Content-Type": "text/plain" });
			response.end();
		}
	});
};

var saveData = function(board, response) {
	async.waterfall([
		// open db
		function(callback) {
	    	openDb(callback);
		},

	    // save the board
	    function(db, callback) {
    		console.log('Saving the data.');

			// TODO: actually save the real data
    		saveDataInternal(db, testData);

    		response.writeHead(200, { "Content-Type": "text/plain" });
			response.end();

			db.close();

	    	// and we're done
	        callback(null);
	    }	    
	], function (err, result) {
		// all done
		if (err) {
			console.log('Something went wrong with saving the data!')

			response.writeHead(500, { "Content-Type": "text/plain" });
			response.end();
		}
	});
};

var saveDataInternal = function(db, data) {
	console.log('Saving data...');

	// for now, we'll just out the board and re-add it; no partial updates
	var board = db.collection(dataTableName, function(err, collection) {
		collection.findOne({ "TeamId": singleDataIdentifier }, function(err, item) {
			if (err) {
				// note, an error here doesn't mean we didn't find the specified board; it means
				// that we were unable to even run the "find" operation
				console.log("Unable to retrieve data. Save failed.");
			}

			if (item == null) {
				console.log("Seeing the data for the first time, saving it.");

				collection.insert(testData);
			} else {
				collection.remove({ "TeamId": singleDataIdentifier });
				collection.insert(testData);
			}

			// create index; if exists, no-op
			// we have to do this *after* a document is first inserted
			collection.ensureIndex({ "TeamId": singleDataIdentifier });

			console.log('Data saved.');
		});
	});
}

exports.getData = getData;
exports.saveData = saveData;