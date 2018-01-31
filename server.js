var express = require ('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var config = require('./config');
var mongoose = require('mongoose');

// ========================
// = Server configuration =
// ========================

// Set variables
var port = process.env.PORT || config.api_port  //Port to access the API

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

<<<<<<< HEAD
// --- Mail API ---

// Setup mailobject
  // user MHP = no-reply@test.gimmi.be
  // password MHP = testGimmi1
  // server MHP = smtp.mijnhostingpartner.nl
  // port MHP = 25 (SMTP)

  /* // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  nodemailer.createTestAccount((err, account) => {

      // create reusable smtpTransporter object using the default SMTP transport
      let smtpTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false, // true for 465, false for other ports
          auth: {
              user: account.user, // generated ethereal user
              pass: account.pass  // generated ethereal password
          }
      });

      // setup email data with unicode symbols
      let mailOptions = {
          from: '"Fred Foo 👻" <foo@blurdybloop.com>', // sender address
          to: 'bar@blurdybloop.com, baz@blurdybloop.com', // list of receivers
          subject: 'Hello ✔', // Subject line
          text: 'Hello world?', // plain text body
          html: '<b>Hello world?</b>' // html body
      };

      // send mail with defined transport object
      smtpTransporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              return console.log(error);
          }
          console.log('Message sent: %s', info.messageId);
          // Preview only available when sending through an Ethereal account
          console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

          // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@blurdybloop.com>
          // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
      });
  }); 
  */
var smtpTransporter = nodemailer.createTransport({
  host: 'smtp.mijnhostingpartner.nl',
  port: 587,
  secure: false,
  auth: {
    user: "info@gimmi.be",
    pass: "gimmiInfo1"
  }
});

// verify connection configuration
smtpTransporter.verify(function (error, success) {
  if (error) {
    console.log(error);
  } else {
    console.log('Mailserver is connected');
  }
});

//smtp middleware
smtpTransporter.use('compile', htmlToText()); //The plugin checks if there is no text option specified and populates it based on the html value. (https://www.npmjs.com/package/html-to-text)

// Mail route POST
app.post('/api/email', (req, res, next) => {
  var mailOptions = {
    from: '"Gimmi" <no-reply@gimmi.be>',
    to: req.body.to,
    subject: req.body.subject,
    html: req.body.html //geen text-value meer ==> html wordt naar text omgezet
  };

  smtpTransporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      var data = {
        error: error,
        message: 'Mail not sent.'
      }
      res.status(500).json(data);
      return next();
    }
    console.log('Message sent: %s (%s)', info.messageId, info.response);
    res.status(250).json(info.messageId);
  });
});

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

              //Add loginStrategy to person object
              personObj = person.toObject();
              personObj.loginStrategy = "local";

              // Create a token
              var token = jwt.sign(personObj, app.get('superSecret'), {
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

      Person.findOneAndUpdate(
        { "accounts.facebook.id": req.body.fb.authResponse.userID }, 
        { $set: { "accounts.facebook.token": req.body.fb.authResponse.accessToken, "accounts.facebook.profile_pic": req.body.userInfo.picture.data.url } }, 
        { new: true }, 
        function (err, personWithFBaccount) {
          if (err) { return next(err) }
          
          if (personWithFBaccount) { // Person found with Facebook-account used for login
            console.info("Facebook account (token/pic) updated for : " + personWithFBaccount.email);
            //Add loginStrategy to person object
            personObj = personWithFBaccount.toObject();
            personObj.loginStrategy = "facebook";

            // Create a token
            var token = jwt.sign(personObj, app.get('superSecret'), {
              expiresIn: "24h" // expires after 24 hours
            });
            //Return token as json
            res.status(201).json({ //WRONG implementation!! Registration should return a 201, but shouldn't add a token ==> after registration: call authentication to receive token!!
              success: true,
              message: 'Enjoy your token!',
              token: token
            });
          } else { // No person found with Facebook account used for login (= new user or add FB account to existing user)
            console.info("No user found with this FB account");
            Person.findOne({ email: req.body.userInfo.email.toLowerCase() }, function (err, person) {
              if (err) return next(err);

              if (!person) {//There's no person with the email address of the facebook account ==> add new Person
                console.info("No user found with FB account and with email linked to FB account");
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
                  console.info("New person added: " + person.email);

                  //Add loginStrategy to person object
                  personObj = person.toObject();
                  personObj.loginStrategy = "facebook";

                  // Create a token
                  var token = jwt.sign(personObj, app.get('superSecret'), {
                    expiresIn: "24h" // expires after 24 hours
                  });
                  //Return token as json
                  res.status(201).json({ //WRONG implementation!! Registration should return a 201, but shouldn't add a token ==> after registration: call authentication to receive token!!
                    success: true,
                    message: 'Enjoy your token!',
                    token: token
                  });
                })
              } else if (!person.accounts.facebook) { // A person with the email linked to the facebook account exists, but the FB account wasn't registered yet ==> add FB account 
                console.info("Facebookaccount added to existing person with FB account email: " + person.email);
                Person.findOneAndUpdate({ email: person.email },
                  {
                    $set: {
                      "accounts.facebook": {
                        id: req.body.fb.authResponse.userID,
                        token: req.body.fb.authResponse.accessToken,
                        profile_pic: req.body.userInfo.picture.data.url
                      }
                    }
                  },
                  { new: true /* return the new document instead of the old */ })
                  .exec(function (err, doc) {
                    if (err) { res.send({ msg: 'Authentication failed' }, 404); }

                    //Add loginStrategy to person object
                    personObj = doc.toObject();
                    personObj.loginStrategy = "facebook";

                    // Create a token
                    var token = jwt.sign(personObj, app.get('superSecret'), {
                      expiresIn: "24h" // expires after 24 hours
                    });
                    //Return token as json
                    res.status(201).json({ //WRONG implementation!! Registration should return a 201, but shouldn't add a token ==> after registration: call authentication to receive token!!
                      success: true,
                      message: 'Enjoy your token!',
                      token: token
                    });
                  });
              } else if (person.accounts.facebook.id !== req.body.fb.authResponse.userID) { // A person with same email exists, but different FB account ID saved ==> update FB account ID
                Person.findOneAndUpdate(
                  { email: req.body.userInfo.email.toLowerCase() }, 
                  { $set: { "accounts.facebook.token": req.body.fb.authResponse.accessToken, "accounts.facebook.id": req.body.fb.authResponse.userID }, "accounts.facebook.profile_pic": req.body.userInfo.picture.data.url }, 
                  { new: true }, 
                  function (err, personWithNewFBid) {
                    if (err) return next(err);
                    
                    if (personWithNewFBid) {
                      console.info("Facebook ID updated for user: " + personWithNewFBid.email);

                      personObj = personWithNewFBid.toObject();
                      personObj.loginStrategy = "facebook";

                      // Create a token
                      var token = jwt.sign(personObj, app.get('superSecret'), {
                        expiresIn: "24h" // expires after 24 hours
                      });
                      //Return token as json
                      res.status(201).json({ //WRONG implementation!! Registration should return a 201, but shouldn't add a token ==> after registration: call authentication to receive token!!
                        success: true,
                        message: 'Enjoy your token!',
                        token: token
                      });
                    }                  
                  }
                );
              }
            });
          }
        }
      );
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
            //Add loginStrategy to person object
            personObj = person.toObject();
            personObj.loginStrategy = "local";

            // Create a token
            var token = jwt.sign(personObj, app.get('superSecret'), {
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
  });

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
          req.decoded = decoded;
          next();
        }
      })
    } else { // no token available
      // Return an error
      return res.status(401).send({
        success : false,
        message : "No token provided"
      })
    }
  });

// --- Wish API routes ---
// Retrieve a wishlist
app.get('/api/wishlist/:receiverId', function (req, res, next) {
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
    {
      $lookup: { //Opgelet:virtuals worden hier niet meegenomen, dus als 'fullname' van een person nodig zou zijn hier, moet dit toegevoegd worden in één van de volgende stages
        from: "people",
        localField: "receiver",
        foreignField: "_id",
        as: "receiver"
      }
    },
    { $unwind: "$creator" },
    { $unwind: "$receiver" },
    {
      $group: {
        _id: { receiver: "$receiver" },
        wishes: {
          $push: {
            _id: "$_id",
            title: "$title",
            image: "$image",
            price: "$price",
            url: "$url",
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
        "wishes.createdBy": { "email": 0, "accounts": 0 },
        "_id.receiver": { "email": 0, "accounts": 0 },
      }
    }
  ]).exec(function (err, wishlist) {
    if (err) { return next(err) }
    if (!Array.isArray(wishlist) || !wishlist.length) {
      Person.findById(req.params.receiverId, { accounts: 0, email: 0, createdAt: 0, updatedAt: 0 }, function (err, person) {
        wishlist = [{
          _id: { receiver: person },
          count: 0,
          wishes: []
        }];
        res.json(wishlist);
      });
    } else {
      res.json(wishlist);
    }
  })
})

// Get a wish
app.get('/api/wish/:id', function (req, res, next) {
  Wish.find({ _id: req.params.id })
    .populate('createdBy reservation.reservedBy', 'firstName lastName')
    .exec(function (err, result) {
      if (err) return next(err);
      res.status(200).json(result);
    });
});

function convertNovalueToUndefined(object) {
  return _.mapValues(object, function (value) {
    if (value === "#*/NO_VALUE/*#") {
      return value = undefined;
    } else {
      return value;
    }
  });
}

// Update a wish
app.put('/api/wish/:id', function (req, res, next) {
  var wish = convertNovalueToUndefined(req.body);
  Wish.findOneAndUpdate({ _id: req.params.id }, wish, { new: true })
    .populate('createdBy reservation.reservedBy', 'firstName lastName')
    .exec(function (err, doc) {
      if (err) { res.send({ msg: 'Wish not found' }, 404) }
      res.status(201).json(doc);
    });
})
// Reservation API - POST
app.post('/api/wish/:id/reservation', function (req, res, next) {
  Wish.findOneAndUpdate({ _id: req.params.id },
    {
      reservation: {
        reservedBy: req.body.reservedBy,
        amount: req.body.amount,
        reservationDate: req.body.reservationDate,
        reason: req.body.reason
      }
    },
    { new: true })
    .populate('createdBy', 'firstName lastName')
    .populate('reservation.reservedBy', 'firstName lastName')
    .exec(function (err, doc) {
      if (err) { res.send({ msg: 'Reservation failed' }, 404); }
      res.status(201).json(doc);
    });
});
// Reservation API - DELETE
app.delete('/api/wish/:id/reservation', function (req, res, next) {
  Wish.findOneAndUpdate({ _id: req.params.id }, { $unset: { reservation: "" } }, { new: true })
    .populate('createdBy', 'firstName lastName')
    .exec(function (err, doc) {
      if (err) { res.send({ msg: 'Reservation delete failed' }, 404); }
      res.status(201).json(doc);
    });
});
// Reservation API - GET
// Reservation API - PUT

// Delete a wish
app.delete('/api/wish/:id', function (req, res, next) {
  Wish.findByIdAndRemove(req.params.id, function (err, post) {
    if (err) return next(err)
    res.status(201).json(post)
  })
})

// Get a person by ID
app.get('/api/people/:id', function (req, res, next) {
  if (req.params.id === req.decoded._id) { // Check if the requesting user is the same as the requested person
    Person.findOne({ _id: req.params.id }, function (err, person) {
      if (err) {
        return res.status(500).json({
          error: "The query could not be fulfilled on the server."
        })
      }
      if (person) { // person found
        res.status(200).json(person);
      } else {
        res.status(404).json({
          error: "Person not found."
        });
      }
    });
  } else { // User is not authorised to view this user
    res.status(403).json({
      error: "403 - User tries to view/edit another user. This is forbidden."
    });
  }
});

//Update person details
app.put('/api/people/:id', function(req, res, next){
  //Todo: controleren of de velden gegevens bevatten in het juiste type
  if (req.params.id === req.decoded._id) { // Check if the requesting user is the same as the requested person
    Person.findOneAndUpdate(
      { "_id": req.body._id }, //find person with the corresponding ID
      { $set: { "firstName": req.body.firstName, "lastName": req.body.lastName, "birthday": req.body.birthday } },
      { new: true },
      function (err, updatedPerson) {
        if (err) { return next(err);}
        res.status(200).json(updatedPerson);
      });
  } else {
    res.status(403).json({
      error: "403 - User tries to view/edit another user. This is forbidden."
    });
  }
});

  // Accounts API
  // Local Gimmi account
  app.put('/api/people/:id/account/local', function(req, res, next) {
    if(req.body.pw){
      Person.findById(req.params.id, function (err, person) {  //find person with the corresponding ID
        if (err) return next(err);
        if (!person.accounts.local) { // if person doesn't have a local account: add a local account with password
          person.accounts.local = { "password": req.body.pw};
        } else { // if person has local account: update password
          person.accounts.local.password = req.body.pw;
        }
        person.markModified('accounts.local.password');
        person.save(function(err, person, numAffected){
          if (err) return next(err);
          res.status(200).json(person);
        });
      });
          
    } else {
      return next("No password provided");
    }
  });

  // Facebook account
  app.delete('/api/people/:id/account/facebook', function(req, res, next){
    Person.findByIdAndUpdate(req.params.id, { $unset: { "accounts.facebook": "" } }, { new: true } , function(err, person){
      if (err) return next(err);
      
      var token = null;
      var personObj = person.toObject(); // Convert het MongoDB object naar een gewoon Javascript object
      
      if (personObj.accounts.local) {
        personObj.loginStrategy = "local"; //Add loginStrategy to person object
        token = createJWTtoken(personObj); // Creëer een nieuwe token
      }
      
      res.status(200).json(token); // Stuur de nieuwe token als response van de call
    });
  });

  function createJWTtoken (person){
    // Create a token
    return jwt.sign(person, app.get('superSecret'), {
      expiresIn: "24h" // expires after 24 hours
    });
  }
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
  });

  //TODO: route to verify a token
=======
// Validate (un)protected routes 
app.all('/*', require('./middleware/validateRequest'));

app.use('/dev', require('./api/dev/dev-api'));
app.use('/api/email', require('./api/communication/mail/mail-api'));
app.use('/api/gcse', require('./api/gcse/gcse-api'));
app.use('/api/people', require('./api/people/routes'));
app.use('/api/authenticate', require('./api/auth/routes'));
app.use('/api/wishlist', require('./api/wishes/wishlist/routes'));
app.use('/api/wish', require('./api/wishes/routes'));
app.use('/api/reporting', require('./api/reporting/routes'));
>>>>>>> release-1.1.0

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
