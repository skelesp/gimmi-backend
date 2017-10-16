var express = require ('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var jwt = require('jsonwebtoken');
var config = require('./config');
var request = require('request');
var mongoose = require('mongoose');
var util = require('util');
var _ = require('lodash');

// load needed mongoose data models
var Wish = require('./data_models/wish-model')
var Person = require('./data_models/person-model')

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

// Google Custom Search route
app.get('/api/gcse/:search/', function(req, res) {
  /* GCSE REST API reference : https://developers.google.com/custom-search/json-api/v1/reference/cse/list */
  /* PRICING (for > 100 request / day) https://developers.google.com/custom-search/json-api/v1/overview#pricing */
  var searchType = "image";
  var url = "https://www.googleapis.com/customsearch/v1?key=" + process.env.GOOGLE_API_KEY
        + "&cx=" + process.env.GOOGLE_CSE_ID
        + "&q=" + req.params.search
        + "&searchType=" + searchType;

  request.get(url, function(err, response, body) {
    if (err) return next(err)
    res.json(JSON.parse(body).items);
  });
});

// Test route to see if server is running
app.get('/api', function (req, res) {
  res.send('Welcome to the GIMMI API!');
});

// --- Wish API routes ---
  // Retrieve a wishlist
  app.get('/api/wishlist/:receiverId', function(req, res, next){
    Wish.aggregate([
      { $match: { receiver: new mongoose.Types.ObjectId(req.params.receiverId) } },
      {
        $lookup: { //Opgelet:virtuals worden hier niet meegenomen, dus als 'fullname' van een person nodig zou zijn hier, moet dit toegevoegd worden in één van de volgende stages
          from: "people",
          localField: "createdBy",
          foreignField: "_id",
          as: "creator"
        }
      },
      {$unwind: "$creator"},
      {
        $group: {
          _id: { receiverID: "$receiver" },
          wishes: {
            $push: {
              _id: "$_id",
              title: "$title",
              image: "$image",
              price: "$price",
              createdAt: "$createdAt",
              createdBy: "$creator",
              reservation: "$reservation"
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          "wishes.createdBy": { "email": 0, "accounts": 0 }
        }
      }
    ]).exec( function(err, wishlist){
      if (err) {return next(err)}
      if (!Array.isArray(wishlist) || !wishlist.length) {
          wishlist = [{
            _id: {receiverID: req.params.receiverId},
            count: 0,
            wishes: []
          }];
      }
      res.json(wishlist)
    })
  })

  // Get a wish
  app.get('/api/wish/:id', function(req, res, next){
    Wish.find({_id: req.params.id})
        .populate('createdBy reservation.reservedBy', 'firstName lastName')
        .exec( function(err, result){
      if (err) return next (err);
      res.status(200).json(result);
    });
  });

  function convertNovalueToUndefined (object) {
		return _.mapValues(object, function(value){
			if (value === "#*/NO_VALUE/*#") {
				return value = undefined;
			} else {
				return value;
			}
		});
  }

  // Update a wish
  app.put('/api/wish/:id', function(req, res, next){
    var wish = convertNovalueToUndefined(req.body);
    Wish.findOneAndUpdate({_id: req.params.id}, wish, {new: true})
        .populate('createdBy', 'firstName lastName')
        .exec( function(err, doc){
          if (err) {res.send({msg: 'Wish not found'}, 404)}
          res.status(201).json(doc);
        });
  })
// Reservation API - POST
  app.post('/api/wish/:id/reservation', function(req, res, next){
    Wish.findOneAndUpdate({_id: req.params.id},
          {reservation: {reservedBy: req.body.reservedBy,
                        amount: req.body.amount,
                        reservationDate: req.body.reservationDate,
                        reason: req.body.reason}
          },
        {new: true})
    .populate('createdBy', 'firstName lastName')
    .populate('reservation.reservedBy', 'firstName lastName')
    .exec( function(err, doc){
      if (err) {res.send({msg: 'Reservation failed'}, 404);}
      res.status(201).json(doc);
    });
  });
// Reservation API - DELETE
  app.delete('/api/wish/:id/reservation', function(req, res, next){
    Wish.findOneAndUpdate({_id : req.params.id}, {$unset: { reservation: "" }}, {new: true})
    .populate('createdBy', 'firstName lastName')
    .exec(function(err, doc) {
      if (err) {res.send({msg: 'Reservation delete failed'}, 404);}
      res.status(201).json(doc);
    });
  });
// Reservation API - GET
// Reservation API - PUT

  // Delete a wish
  app.delete('/api/wish/:id', function(req,res,next){
    Wish.findByIdAndRemove(req.params.id, function(err, post){
      if (err) return next(err)
      res.status(201).json(post)
    })
  })

  // --- Person API routes ---

  // Get all the people registered in Gimmi
  app.get('/api/people/', function (req,res,next){
    Person.find({}, 'firstName lastName', function(err, people){
      if (err) {return next(err)}
      res.json(people)
    })
  })

  //Authenticate a person
  app.post('/api/authenticate', function(req,res,next){
    if (req.body.account === "local"){
      Person.findOne({ email: req.body.email.toLowerCase() }, function (err, person) {
        if (err) return next(err);

        if (!person) {
          res.status(401).json({ success: false, message: "Authentication failed." })
        } else {
          //Check password
          person.comparePassword(req.body.password, function (err, isMatch) {
            if (err) next(err);

            if (!isMatch) {
              res.status(401).json({ success: false, message: 'Authentication failed!' })
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
          });
        }
      });
    } else if (req.body.account === "facebook") {
      Person.findOne({ email: req.body.userInfo.email.toLowerCase() }, function (err, person) {
        if (err) return next(err);
        
        if (!person) {//There's no person with the email address of the facebook account
          var person = new Person({
            firstName: req.body.userInfo.first_name,
            lastName: req.body.userInfo.last_name,
            email: req.body.userInfo.email.toLowerCase(),
            /* birthday: req.body.birthday, */
            accounts: {
              facebook: {
                id: req.body.fb.authResponse.userID,
                token: req.body.fb.authResponse.accessToken,
                profile_pic: req.body.userInfo.picture.data.url
              }
            }
          });
          person.save(function (err) {
            if (err) { return next(err) }
            // Create a token
            console.info("New person added: " + person.email);
            var token = jwt.sign(person.toObject(), app.get('superSecret'), {
              expiresIn: "24h" // expires after 24 hours
            });
            //Return token as json
            res.status(201).json({ //WRONG implementation!! Registration should return a 201, but shouldn't add a token ==> after registration: call authentication to receive token!!
              success: true,
              message: 'Enjoy your token!',
              token: token
            });
          })
        } else if (!person.accounts.facebook){ // A person with the email linked to the facebook account, but the FB account wasn't registered yet
          console.info("Facebookaccount added to existing person: " + person.email);
          Person.findOneAndUpdate({ email: person.email },
            { $set: {
              "accounts.facebook": {
                id: req.body.fb.authResponse.userID,
                token: req.body.fb.authResponse.accessToken,
                profile_pic: req.body.userInfo.picture.data.url
                }
              }
            },
            { new: true /* return the new document instead of the old */}) 
            .exec(function (err, doc) {
              if (err) { res.send({ msg: 'Authentication failed' }, 404); }
              
              var token = jwt.sign(doc.toObject(), app.get('superSecret'), {
                expiresIn: "24h" // expires after 24 hours
              });
              //Return token as json
              res.status(201).json({ //WRONG implementation!! Registration should return a 201, but shouldn't add a token ==> after registration: call authentication to receive token!!
                success: true,
                message: 'Enjoy your token!',
                token: token
              });
            });

        } else if (person.accounts.facebook && person.accounts.facebook.id === req.body.fb.authResponse.userID) { // Person found with the email addres linked to a FB account and FB account already linked to person
          console.info("Facebookaccount gevonden bij persoon: " + person.email);
          var token = jwt.sign(person.toObject(), app.get('superSecret'), {
            expiresIn: "24h" // expires after 24 hours
          });
          //Return token as json
          res.status(201).json({ //WRONG implementation!! Registration should return a 201, but shouldn't add a token ==> after registration: call authentication to receive token!!
            success: true,
            message: 'Enjoy your token!',
            token: token
          });
        }
      });
    }
  });

  // Register a Person
  app.post('/api/people/', function(req,res,next){
    // Check if there is no other person with same email
    Person.findOne({
      email: req.body.email.toLowerCase()
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
            email : req.body.email.toLowerCase(),
            birthday : req.body.birthday,
            accounts: {
              local: { password: req.body.password }
            }
          });
          
          console.log(person.email + " is registered.");
          person.save(function(err){
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
          console.log("Failed to verify token:" + token);
          return res.status(401).json({success: false, message:"Failed to validate token. Token could be expired or wrong."})
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

  // Create a wish
  app.post('/api/wish', function(req, res, next){
   var wish = new Wish ({
      title: req.body.title,
      price: parseInt(req.body.price, 10) || null,
      url: req.body.url,
      image: req.body.image,
      size: req.body.size,
      color:  req.body.color,
      description:  req.body.description,
      amountWanted:  req.body.amountWanted,
      receiver: req.body.receiver,
      createdBy: req.body.createdBy
    });
    wish.save(function(err, wish) {
      if (err) {
        console.log(err);
        return next(err);
      }
      Wish.populate(wish, {path: "createdBy", select:{ 'accounts': 0, 'email': 0 } }, function (err, wish){
        res.status(201).json(wish)
      });
    })
  })


  // Get a person by ID
  app.get('/api/people/:id', function(req,res,next){
    Person.findOne({_id: req.params.id}, function(err, person){
      if (err) {
          return res.status(500).json({
            error:"The query could not be fulfilled on the server."
          })
      }
      res.status(200).json(person);
    });
  });

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
