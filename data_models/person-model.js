var db = require('../db');

var personSchema = new db.Schema({
  firstName: {type: String, required: true},
  lastName: {type: String, required: true},
  birthday: {type: Date, required: false},
  email: {type: String, required: true},
  password: {type: String, required: true}
},
{
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});
personSchema.virtual('fullName').get(function(){
  return this.firstName + ' ' + this.lastName;
});

var Person = db.model('Person', personSchema);

module.exports = Person;
