module.exports = function (app, authenticatedUser) {
  //index
  app.get('/', authenticatedUser, function(req, res) {
    res.render('index', { title: 'Home' })
  });
  // team view
  app.get('/team/:id', authenticatedUser, function(req, res) {
    res.render('team', { title: 'Team', id: req.params.id })
  });
}
