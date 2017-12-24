var jwt = require('jsonwebtoken');
var config = require('../config');

module.exports = function(req, res, next) {
    // List all routes which don't need protection
    var unprotectedRestCalls = [
        { //authenticate a user
            route: '/api/authenticate',
            method: 'POST'
        },
        { // Register new person
            route: '/api/people',
            method: 'POST'
        },
        { // Get list of all people
            route: '/api/people',
            method: 'GET'
        }
    ];
    var protected = true;

    // 
    for (var i = 0, l = unprotectedRestCalls.length; i < l; i++) {
        var route = unprotectedRestCalls[i].route;
        var method = unprotectedRestCalls[i].method;
        // If route + method is an unprotected route --> set protected to false
        if (req.method === method && req.originalUrl === route) {
            protected = false;
        }
    }
    
    // If route is protected, check the token
    if (protected){
        // Check if header or url or post data contains a token
        var token = req.body.token || req.query.token || req.headers["authorization"]

        // Decode the token
        if (token) {
            // Verify secret and "expiresIn"
            jwt.verify(token, config.jwt_secret, function (err, decoded) {
                if (err) {
                    console.log("Failed to verify token:" + token);
                    return res.status(401).json({ success: false, message: "Failed to validate token. Token could be expired or wrong." })
                } else {
                    // Everything ok: save the decoded data for other routes
                    req.decoded = decoded;
                    next();
                }
            });
        } else { // no token available
            // Return an error
            return res.status(401).send({
                success: false,
                message: "No token provided"
            })
        }
    } else { // Route is unprotected, go to next middleware
        next();
    }
}