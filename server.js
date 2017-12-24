var express = require ('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var config = require('./config');
var mongoose = require('mongoose');
/* var util = require('util'); */
var _ = require('lodash');


// load needed mongoose data models
var Wish = require('./data_models/wish-model');
var Person = require('./api/people/model');


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

// Validate (un)protected routes 
app.all('/*', require('./middleware/validateRequest'));

// =================
// = Server routes =
// =================
app.use('/dev', require('./api/dev/dev-api'));
app.use('/api/email', require('./api/communication/mail/mail-api'));
app.use('/api/gcse', require('./api/gcse/gcse-api'));
app.use('/api/people', require('./api/people/routes'));
app.use('/api/authenticate', require('./api/auth/routes'));

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
});

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
