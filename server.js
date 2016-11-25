var express = require ('express')
var app = express()
var bodyParser = require('body-parser')
var morgan = require('morgan')
var jwt = require('jsonwebtoken')
var config = require('./config')

// load needed mongoose data models
var Wish = require('./data_models/wish-model')
var Person = require('./data_models/person-model.js')

// ========================
// = Server configuration =
// ========================

// Set variables
var port = process.env.PORT || config.api_port  //Port to access the API
app.set('superSecret', config.jwt_secret)       //Secret variable to sign tokens

// Use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Log all requests with morgan
app.use(morgan('dev'))

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

// Test route to see if server is running
app.get('/api', function (req, res) {
  res.send('Welcome to the GIMMI API!')
})

// --- Wish API routes ---
  // Retrieve a collection of wishes
  app.get('/api/wishes/', function(req, res, next){
    Wish.find(function(err, wishes){
        if (err) {return next(err)}
        res.json(wishes)
    })
  })

  // Update a wish
  app.post('/api/wish/:id', function(req, res, next){
      Wish.findOneAndUpdate({_id: req.params.id}, req.body, {new: true}, function(err, doc){
          if (err) {res.send({msg: 'Note not found'}, 404)}
          res.status(201).json(doc)
      })
  })

  // Delete a wish
  app.delete('/api/wish/:id', function(req,res,next){
    Wish.findByIdAndRemove(req.params.id, function(err, post){
      if (err) return next(err)
      res.status(201).json(post)
    })
  })

// --- Person API routes ---
  //Authenticate a person
  app.post('/api/authenticate', function(req,res,next){
    Person.findOne({
      email : req.body.email
    }, function (err, person){
      if (err) return next(err)
      if (!person) {
        res.status(401).json({success: false, message: "Authentication failed. Person not found."})
      } else if (person) {
        //Check password
        if (person.password != req.body.password) {
          res.status(401).json({ success: false, message: 'Authentication failed. Wrong password'})
        } else { // Person found and correct password
          // Create a token
          var token = jwt.sign(person.toObject(), app.get('superSecret'), {
            expiresIn: "24h" // expires after 24 hours
          })
          //Return token as json
          res.status(200).json({
            success: true,
            message: 'Enjoy your token!',
            token: token
          })
        }
      }
    })
  })

  // Register a Person
  app.post('/api/people/', function(req,res,next){
    // Check if there is no other person with same email
    Person.findOne({
      email: req.body.email
    }, function(err, person) {
      if (err) { // Query returned an error
        res.json({
          type: false,
          data: "Error occured: " + err
        })
      } else {
        if (person) { // Person with same email found
          //TODO: hier misschien ook controle op paswoord toevoegen : indien het klopt: token meegeven
          console.log("user '"+person.email+"' tried to register again");
          res.status(500).json({
            type: false,
            error: "User already exists"
          })
        } else { // REGISTER, because no person found with same email
          var person = new Person({
            firstName : req.body.firstname,
            lastName : req.body.lastname,
            email : req.body.email,
            password : req.body.password
          })
          console.log(person.email + " is registered.");
          person.save(function(err, newPerson){
            if (err) {return next(err)}
            // Create a token
            var token = jwt.sign(person.toObject(), app.get('superSecret'), {
              expiresIn: "24h" // expires after 24 hours
            });
            //Return token as json
            res.status(201).json({
              success: true,
              message: 'Enjoy your token!',
              token: token
            })
          })
        }
      }
    })
  })

  app.use(function(req, res, next){
    // Check if header or url or post data contains a token
    var token = req.body.token || req.query.token || req.headers["authorization"]

    // Decode the token
    if (token) {
      // Verify secret and "expiresIn"
      jwt.verify(token, app.get('superSecret'), function(err, decoded) {
        if (err) {
          return res.json({success: false, message:"Failed to authenticate token."})
        } else {
          // Everything ok: save the decoded data for other routes
          req.decoded = decoded
          next()
        }
      })
    } else { // no token available
      // Return an error
      return res.status(401).send({
        success : false,
        message : "No token provided"
      })
    }
  })

  // Register a wish
  app.post('/api/wish', function(req, res, next){
    var wish = new Wish ({
      title: req.body.title,
      price: req.body.price,
      status: req.body.status,
      receiver: req.body.receiver
    })
    wish.save(function(err, wish) {
      if (err) {return next(err)}
      res.status(201).json(wish)
    })
  })

  // Get all the people registered in Gimmi
  app.get('/api/people/', function (req,res,next){
    Person.find({}, function(err, people){
      if (err) {return next(err)}
      res.json(people)
    })
  })

  //TODO: route to verify a token

// ========================
// = Catch errors and log =
// ========================


process.on('uncaughtException', function(err) {
  console.log(err);
});

// ====================
// = start the server =
// ====================

var server = app.listen(port, function(){
  console.log('Server running @ port '+server.address().port)
})
