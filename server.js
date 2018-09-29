var express = require ('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var config = require('./config');
var fs = require('fs');
var https = require('https');

// ========================
// = Server configuration =
// ========================

// Set variables
var port = process.env.PORT || config.api_port;  //Port to access the API
var nodeEnv = process.env.NODE_ENV || 'dev';
var options = {
  key : fs.readFileSync( './sslcert/localhost.key' ),
  cert : fs.readFileSync( './sslcert/localhost.pem' ),
  requestCert: false,
  rejectUnauthorized: false
};

// Use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Log all requests with morgan
app.use(morgan(':date[clf] :method :url :status :response-time ms - :res[content-length]'))

// Add headers to all responses to prevent CORS errors
app.all("/api/*", function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With")
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE")

    if (req.method === "OPTIONS"){
      res.send();
    } else {
      return next()
    }
})

// =================
// = Server routes =
// =================

// Validate (un)protected routes 
app.all('/*', require('./middleware/validateRequest'));

app.use('/dev', require('./api/dev/dev-api'));
app.use('/api/email', require('./api/communication/mail/routes'));
app.use('/api/gcse', require('./api/gcse/gcse-api'));
app.use('/api/people', require('./api/people/routes'));
app.use('/api/authenticate', require('./api/auth/routes'));
app.use('/api/wishlist', require('./api/wishes/wishlist/routes'));
app.use('/api/wish', require('./api/wishes/routes'));
app.use('/api/reporting', require('./api/reporting/routes'));

// ========================
// = Catch errors and log =
// ========================

process.on('uncaughtException', function(err) {
  console.log(err);
});

// ====================
// = start the server =
// ====================
console.log("Environment = " + nodeEnv);
if (nodeEnv === 'dev') {
  var server = https.createServer(options, app).listen(port, function() {
    console.log('HTTPS Server running @ port ' + server.address().port);
  });
} else {
  // On Heroku, SSL termination is used, so no need for a HTTPS server. Communication on server is in HTTP.
  // So in production/test : no need to set up a HTTPS server.
  var server = app.listen(port, function () {
    console.log('HTTP Server running @ port ' + server.address().port)
  })
};
