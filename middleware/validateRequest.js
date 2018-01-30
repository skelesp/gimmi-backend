var jwt = require('jsonwebtoken');
var config = require('../config');

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
    },
    { // Check if email exists
        route: '/api/people/email/*',
        method: 'GET'
    },
    { // Get username by ID
        route: '/api/people/*/name',
        method: 'GET'
    }
];

module.exports = function(req, res, next) {
    
    var protected = true;

    // Loop through unprotected calls to check if callRoute corresponds
    for (var i = 0, l = unprotectedRestCalls.length; i < l; i++) {
        var controlRoute = unprotectedRestCalls[i].route;
        var controlMethod = unprotectedRestCalls[i].method;
        var callRoute = req.originalUrl;
        var callMethod = req.method;

        // replace parameters in callroute for security check
        callRoute = replaceParamsInCallRoute(callRoute, controlRoute);

        // If route + method is an unprotected route --> set protected to false
        if (callMethod === controlMethod && callRoute === controlRoute) {
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
                    req.authenticatedUser = decoded;
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

function replaceParamsInCallRoute(callRoute, controlRoute) {
    controlRouteArr = controlRoute.split('/');
    changedRouteArr = callRoute.split('/');
    var changedRoute = "";

    if (changedRouteArr.length === controlRouteArr.length) {
        controlRouteArr.forEach((controlRoutePart, i) => {
            if (controlRoutePart === "*") {
                changedRouteArr[i] = "*";
            }
        });
        changedRoute = changedRouteArr.join('/');
        controlRoute = controlRouteArr.join('/');
    }

    if (changedRoute === controlRoute) {
        return changedRoute;
    } else {
        return callRoute;
    }
}