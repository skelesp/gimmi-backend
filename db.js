var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/gimmi', function () {
  console.log('mongodb connected to gimmi database');
});

module.exports = mongoose;
