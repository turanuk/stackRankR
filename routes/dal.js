module.exports = function (app, dal, authenticatedUser) {

  app.get('/getTeam/:teamid', authenticatedUser, function(req, res){
    dal.getTeam(req.session.auth.twitter.user.id, req.params.teamid, res);
  });

  app.post('/saveTeam/:teamid', authenticatedUser, function(req, res){
    dal.saveTeam(req.body, req.session.auth.twitter.user.id, req.params.teamid, res);
  });

  app.post('/newTeam', authenticatedUser, function(req, res){
    dal.newTeam(req.session.auth.twitter.user.id, res);
  });

  app.post('/deleteTeam/:teamid', authenticatedUser, function(req, res){
    dal.deleteTeam(req.session.auth.twitter.user.id, req.params.teamid, res);
  });

  app.get('/getUserTeams', authenticatedUser, function(req, res){
    dal.getUserTeams(req.session.auth.twitter.user.id, res);
  });
}