module.exports = function(app) {

    // home page
    app.get('/', function(req, res) {
        res.render('index', { title: 'Home' })
    });
}
