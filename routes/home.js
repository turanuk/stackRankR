module.exports = function(app) {
    //index
    app.get('/', function(req, res) {
        res.render('index', { title: 'Home' })
    });
    // team view
    app.get('/team/:id', function(req, res) {
        res.render('team', { title: 'Team', id: req.params.id })
    });
}
