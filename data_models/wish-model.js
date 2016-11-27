var db = require('../db')
var Wish = db.model('Wish', {
  title: {type: String, required: true},
  price: {type: String, required: true},
  status: {type: String, default: "free"},
  receiver: {type: String, required: true}
})

module.exports = Wish
