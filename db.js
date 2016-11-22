var mongoose = require('mongoose');

var url = process.env.MONGOLAB_URI || 'mongodb://localhost/gimmi'
console.log('mongolab_uri:' + process.env.MONGOLAB_URI)
mongoose.connect(url, function (err) {
  if (err) throw (err);
  console.log('mongodb connected to gimmi database');
});

module.exports = mongoose;
