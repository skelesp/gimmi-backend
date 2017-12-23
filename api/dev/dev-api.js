var router = require('express').Router();

router.use(function(req, res, next){
    console.log("DEV: " + req.method + " " + req.url  + " " + req.ip);
    next();
});
// Test route to see if server is running
router.get('/health-check', function (req, res) {
    res.send('The GIMMI API is up and running!');
});

module.exports = router;