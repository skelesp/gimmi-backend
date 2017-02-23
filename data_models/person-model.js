var db = require('../db'),
    bcrypt = require('bcrypt'),
    SALT_WORK_FACTOR = 10;

var personSchema = new db.Schema({
  firstName: {type: String, required: true},
  lastName: {type: String, required: true},
  birthday: {type: Date, required: false},
  email: {type: String, required: true, index: { unique: true } },
  password: {type: String, required: true}
},
{
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});

personSchema.virtual('fullName').get(function(){
  return this.firstName + ' ' + this.lastName;
});

personSchema.pre('save', function(next) {
  var person = this;

  // only hash the password if it has been modified (or is new)
  if (!person.isModified('password') && person.passMigration == false) return next();

  // generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if (err) return next(err);

    // hash the password using our new salt
    bcrypt.hash(person.password, salt, function(err, hash) {
        if (err) return next(err);

        // override the cleartext password with the hashed one
        person.password = hash;
        next();
    });
  });
});

personSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
      if (err) return cb(err);
      cb(null, isMatch);
  });
};

var Person = db.model('Person', personSchema);

module.exports = Person;
