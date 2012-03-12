module.exports = function (app, dal) {

	app.get('/getData', function(req, res){
		dal.getData(res);
	});

	app.post('/saveData', function(req, res){
		dal.saveData(req.body, res);
	});
}
