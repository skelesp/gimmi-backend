var db = require('../db')
var Person = db.model('Person', {
  firstName: {type: String, required: true},
  lastName: {type: String, required: true},
  email: {type: String, required: true},
  password: {type: String, required: true}
})

module.exports = Person
