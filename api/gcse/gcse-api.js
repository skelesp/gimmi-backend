var router = require('express').Router();
var request = require('request');

// Google Custom Search route
router.get('/:search/', function (req, res) {
    /* GCSE REST API reference : https://developers.google.com/custom-search/json-api/v1/reference/cse/list */
    /* PRICING (for > 100 request / day) https://developers.google.com/custom-search/json-api/v1/overview#pricing */
    var searchType = "image";
    var url = "https://www.googleapis.com/customsearch/v1?key=" + process.env.GOOGLE_API_KEY
        + "&cx=" + process.env.GOOGLE_CSE_ID
        + "&q=" + req.params.search
        + "&searchType=" + searchType;

    request.get(url, function (err, response, body) {
        if (err) return next(err)
        res.json(JSON.parse(body).items);
    });
});

module.exports = router;