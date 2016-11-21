var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/test', function () {
  console.log('mongodb connected');
});

module.exports = mongoose;
