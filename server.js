var express = require ('express')
var app = express()
var db = require('./db')

app.get('/', function(req, res){
  res.send('Hello world!')
})

app.get('/yo', function(req, res){
  res.send('YO')
})

var server = app.listen(3000, function(){
  console.log('Server running @ http://localhost:'+server.address().port)
})
