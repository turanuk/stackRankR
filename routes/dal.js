var express = require('express');
var dal = require("./../dal/dataAccessLayer.js");

var app = express.createServer();
app.use(express.bodyParser());

app.get('/getData', function(req, res){
    dal.getData(res);
});

app.post('/saveData', function(req, res){
	dal.saveData(req.body, res);
});