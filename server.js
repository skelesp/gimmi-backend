var express = require ('express')
var bodyParser = require('body-parser')
var app = express()
var Wish = require('./data_models/wish-model')

//Parse request body to json and save in req.body
app.use(bodyParser.json())

//Endpoint to retrieve a collection of wishes
app.get('/api/wishes/', function(req, res, next){
  Wish.find(function(err, wishes){
      if (err) {return next(err)}
      res.json(wishes)
  })
})

//Endpoint to register a wish
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

//Start up server to listen op port 3000
var server = app.listen(3000, function(){
  console.log('Server running @ http://localhost:'+server.address().port)
})
