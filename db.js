var mongoose = require('mongoose');

var url = process.env.DB_URI || 'mongodb://127.0.0.1:27017/gimmi'

mongoose.Promise = global.Promise;
mongoose.connect(url, {useMongoClient: true}, function (err) {
  if (err) {
    console.error(err);
  } else {
    console.log('mongodb connected to gimmi database(' + url + ')');
  }
});

module.exports = mongoose;
