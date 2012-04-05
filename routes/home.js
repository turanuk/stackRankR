module.exports = function (app, authenticatedUser, authorizedUser) {
  //index
  app.get('/', authenticatedUser, function(req, res) {
    res.render('index', { title: 'Home' })
  });

  //login
  app.get('/login', function (req, res) {
    res.render('login', { title: 'Login' })
  });

  // team view
  app.get('/team/:userid/:id', authenticatedUser, authorizedUser, function(req, res) {
      res.render('team', { title: 'Team', userid: req.params.userid, id: req.params.id })
  });
}
