var express = require ('express')
var app = express()
var bodyParser = require('body-parser')
var morgan = require('morgan')
var jwt = require('jsonwebtoken')
var config = require('./config')

// load needed mongoose data models
var Wish = require('./data_models/wish-model')

// ========================
// = Server configuration =
// ========================

// Set variables
var port = process.env.PORT || config.api_port  //Port to access the API
app.set('superSecret', config.secret)       //Secret variable to sign tokens

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
    return next()
})

// =================
// = Server routes =
// =================

// Test route to see if server is running
app.get('/', function (req, res) {
  res.send('Welcome to the GIMMI api!')
})

// --- Wish API routes ---
// Retrieve a collection of wishes
app.get('/api/wishes/', function(req, res, next){
  Wish.find(function(err, wishes){
      if (err) {return next(err)}
      res.json(wishes)
  })
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

// ====================
// = start the server =
// ====================

var server = app.listen(port, function(){
  console.log('Server running @ port '+server.address().port)
})
