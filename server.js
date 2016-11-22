var express = require ('express')
var bodyParser = require('body-parser')
var app = express()
var Wish = require('./data_models/wish-model')

//Parse request body to json and save in req.body
app.use(bodyParser.json())

//Test to see if server is running
app.get('/test', function (req, res) {
  res.send('Test is succesful!')
})

//Add headers to all responses
app.all("/api/*", function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    return next();
});

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

//Endpoint to update a wish
app.post('/api/wish/:id', function(req, res, next){
    Wish.findOneAndUpdate({_id: req.params.id}, req.body, {new: true}, function(err, doc){
        if (err) {res.send({msg: 'Note not found'}, 404)}
        res.status(201).json(doc);
    });
})

//Endpoint to delete a wish
app.delete('/api/wish/:id', function(req,res,next){
  Wish.findByIdAndRemove(req.params.id, function(err, post){
    if (err) return next(err);
    res.json(post);
  });
})

//Start up server to listen op port 3000
var server = app.listen(3000, function(){
  console.log('Server running @ http://localhost:'+server.address().port)
})
