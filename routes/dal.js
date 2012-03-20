module.exports = function (app, dal, authenticatedUser) {

  app.get('/getData', authenticatedUser, function(req, res){
    dal.getData(res);
  });

  app.post('/saveData', authenticatedUser, function(req, res){
    dal.saveData(req.body, res);
  });
}