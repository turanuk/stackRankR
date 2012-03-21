module.exports = function (app, authenticatedUser) {
  //index
  app.get('/', authenticatedUser, function(req, res) {
    res.render('index', { title: 'Home' })
  });
  // team view
  app.get('/team/:userid/:id', authenticatedUser, function(req, res) {
    res.render('team', { title: 'Team', userid: req.params.userid, id: req.params.id })
  });
}
