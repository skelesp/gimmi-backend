var mongoose = require('mongoose');

var url = process.env.MONGODB_URI || 'mongodb://localhost/gimmi'
console.log('mongodb_uri:' + process.env.MONGOLAB_URI)
mongoose.connect(url, function (err) {
  if (err) console.error(err);
  console.log('mongodb connected to gimmi database');
});

module.exports = mongoose;
