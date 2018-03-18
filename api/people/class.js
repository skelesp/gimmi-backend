var router = require('express').Router();
var jwt = require('jsonwebtoken');
var Person = require('./model');
var config = require('../../config');
var crypto = require('crypto');
var Mail = require('../../api/communication/mail/class');

// --- Person API routes ---

// Get all the people registered in Gimmi
exports.getAll = function (req, res, next) {
    Person.find({}, 'firstName lastName', function (err, people) {
        if (err) { return next(err) }
        res.json(people)
    })
};

// Register a Person
exports.register = function (req, res, next) {
    // Check if there is no other person with same email
    Person.findOne({
        email: req.body.email.toLowerCase()
    }, function (err, person) {
        if (err) { // Query returned an error
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            if (person) { // Person with same email found
                //TODO: hier misschien ook controle op paswoord toevoegen : indien het klopt: token meegeven
                console.log("user '" + person.email + "' tried to register again");
                res.status(500).json({
                    type: false,
                    error: "User already exists"
                })
            } else { // REGISTER, because no person found with same email
                var person = new Person({
                    firstName: req.body.firstname,
                    lastName: req.body.lastname,
                    email: req.body.email.toLowerCase(),
                    birthday: req.body.birthday,
                    accounts: {
                        local: { password: req.body.password }
                    }
                });

                console.log(person.email + " is registered.");
                person.save(function (err) {
                    if (err) { return next(err) }
                    //Add loginStrategy to person object
                    personObj = person.toObject();
                    personObj.loginStrategy = "local";

                    // Create a token
                    var token = createJWTtoken(personObj);
                    
                    //Return token as json
                    res.status(201).json({
                        success: true,
                        message: 'Enjoy your token!',
                        token: token
                    });
                })
            }
        }
    })
};

// Get a person by ID
exports.getByID = function (req, res, next) {
    if (req.authenticatedUser) {
        if (req.params.id === req.authenticatedUser._id) { // Check if the requesting user is the same as the requested person
            Person.findOne({ _id: req.params.id }, function (err, person) {
                if (err) {
                    return res.status(500).json({
                        error: "The query could not be fulfilled on the server."
                    })
                }
                if (person) { // person found
                    res.status(200).json(person);
                } else {
                    res.status(404).json({
                        error: "Person not found."
                    });
                }
            });
        } else { // User is not authorised to view this user
            res.status(403).json({
                error: "403 - User tries to view/edit another user. This is forbidden."
            });
        }       
    } else {
        res.status(401).json({
            error: "401 - User is not authenticated."
        });
    }
};

// Get a person's name by ID
exports.getNameByID = function (req, res, next) {
    Person.findOne({ _id: req.params.id }, 'firstName lastName', function (err, person) {
        if (err) {
            return res.status(500).json({
                error: "The query could not be fulfilled on the server."
            })
        }
        if (person) { // person found
            res.status(200).json(person);
        } else {
            res.status(404).json({
                error: "Person not found."
            });
        }
    });
};

// Get a person by ID
exports.getByEmail= function (req, res, next) {
    Person.findOne({ email: req.params.email }, 'firstName lastName email', function (err, person) {
        if (err) {
            return res.status(500).json({
                error: "The query could not be fulfilled on the server."
            })
        }
        
        if (person) { // person found
            res.status(200).json(person);
        } else {
            res.status(404).json({
                error: "Person not found."
            });
        }
    });
};

//Update person details
exports.update = function (req, res, next) {
    //Todo: controleren of de velden gegevens bevatten in het juiste type
    if (req.params.id === req.authenticatedUser._id) { // Check if the requesting user is the same as the requested person
        Person.findOneAndUpdate(
            { "_id": req.body._id }, //find person with the corresponding ID
            { $set: { "firstName": req.body.firstName, "lastName": req.body.lastName, "birthday": req.body.birthday } },
            { new: true },
            function (err, updatedPerson) {
                if (err) { return next(err); }
                res.status(200).json(updatedPerson);
            });
    } else {
        res.status(403).json({
            error: "403 - User tries to view/edit another user. This is forbidden."
        });
    }
};

//Authenticate
exports.authenticate = function (req, res, next) {
    if (req.body.account === "local") {
        Person.findOne({ email: req.body.email.toLowerCase() }, function (err, person) {
            if (err) return next(err);

            if (!person) {
                res.status(401).json({ success: false, message: "Authentication failed." })
            } else {
                //Check password
                person.comparePassword(req.body.password, function (err, isMatch) {
                    if (err) next(err);

                    if (!isMatch) {
                        res.status(401).json({ success: false, message: 'Authentication failed!' })
                    } else { // Person found and correct password

                        //Add loginStrategy to person object
                        personObj = person.toObject();
                        personObj.loginStrategy = "local";

                        // Create a token
                        var token = createJWTtoken(personObj);

                        //Return token as json
                        res.status(200).json({
                            success: true,
                            message: 'Enjoy your token!',
                            token: token
                        })
                    }
                });
            }
        });
    } else if (req.body.account === "facebook") {

        Person.findOneAndUpdate(
            { "accounts.facebook.id": req.body.fb.authResponse.userID },
            { $set: { "accounts.facebook.token": req.body.fb.authResponse.accessToken, "accounts.facebook.profile_pic": req.body.userInfo.picture.data.url } },
            { new: true },
            function (err, personWithFBaccount) {
                if (err) { return next(err) }

                if (personWithFBaccount) { // Person found with Facebook-account used for login
                    console.info("Facebook account (token/pic) updated for : " + personWithFBaccount.email);
                    //Add loginStrategy to person object
                    personObj = personWithFBaccount.toObject();
                    personObj.loginStrategy = "facebook";

                    // Create a token
                    var token = createJWTtoken(personObj);

                    //Return token as json
                    res.status(201).json({ //WRONG implementation!! Registration should return a 201, but shouldn't add a token ==> after registration: call authentication to receive token!!
                        success: true,
                        message: 'Enjoy your token!',
                        token: token
                    });
                } else { // No person found with Facebook account used for login (= new user or add FB account to existing user)
                    console.info("No user found with this FB account");
                    Person.findOne({ email: req.body.userInfo.email.toLowerCase() }, function (err, person) {
                        if (err) return next(err);

                        if (!person) {//There's no person with the email address of the facebook account ==> add new Person
                            console.info("No user found with FB account and with email linked to FB account");
                            var person = new Person({
                                firstName: req.body.userInfo.first_name,
                                lastName: req.body.userInfo.last_name,
                                email: req.body.userInfo.email.toLowerCase(),
                                /* birthday: req.body.birthday, */
                                accounts: {
                                    facebook: {
                                        id: req.body.fb.authResponse.userID,
                                        token: req.body.fb.authResponse.accessToken,
                                        profile_pic: req.body.userInfo.picture.data.url
                                    }
                                }
                            });
                            person.save(function (err) {
                                if (err) { return next(err) }
                                console.info("New person added: " + person.email);

                                //Add loginStrategy to person object
                                personObj = person.toObject();
                                personObj.loginStrategy = "facebook";

                                // Create a token
                                var token = createJWTtoken(personObj);

                                //Return token as json
                                res.status(201).json({ //WRONG implementation!! Registration should return a 201, but shouldn't add a token ==> after registration: call authentication to receive token!!
                                    success: true,
                                    message: 'Enjoy your token!',
                                    token: token
                                });
                            })
                        } else if (!person.accounts.facebook) { // A person with the email linked to the facebook account exists, but the FB account wasn't registered yet ==> add FB account 
                            console.info("Facebookaccount added to existing person with FB account email: " + person.email);
                            Person.findOneAndUpdate({ email: person.email },
                                {
                                    $set: {
                                        "accounts.facebook": {
                                            id: req.body.fb.authResponse.userID,
                                            token: req.body.fb.authResponse.accessToken,
                                            profile_pic: req.body.userInfo.picture.data.url
                                        }
                                    }
                                },
                                { new: true /* return the new document instead of the old */ })
                                .exec(function (err, doc) {
                                    if (err) { res.send({ msg: 'Authentication failed' }, 404); }

                                    //Add loginStrategy to person object
                                    personObj = doc.toObject();
                                    personObj.loginStrategy = "facebook";

                                    // Create a token
                                    var token = createJWTtoken(personObj);

                                    //Return token as json
                                    res.status(201).json({ //WRONG implementation!! Registration should return a 201, but shouldn't add a token ==> after registration: call authentication to receive token!!
                                        success: true,
                                        message: 'Enjoy your token!',
                                        token: token
                                    });
                                });
                        } else if (person.accounts.facebook.id !== req.body.fb.authResponse.userID) { // A person with same email exists, but different FB account ID saved ==> update FB account ID
                            Person.findOneAndUpdate(
                                { email: req.body.userInfo.email.toLowerCase() },
                                { $set: { "accounts.facebook.token": req.body.fb.authResponse.accessToken, "accounts.facebook.id": req.body.fb.authResponse.userID }, "accounts.facebook.profile_pic": req.body.userInfo.picture.data.url },
                                { new: true },
                                function (err, personWithNewFBid) {
                                    if (err) return next(err);

                                    if (personWithNewFBid) {
                                        console.info("Facebook ID updated for user: " + personWithNewFBid.email);

                                        personObj = personWithNewFBid.toObject();
                                        personObj.loginStrategy = "facebook";

                                        // Create a token
                                        var token = createJWTtoken(personObj);

                                        //Return token as json
                                        res.status(201).json({ //WRONG implementation!! Registration should return a 201, but shouldn't add a token ==> after registration: call authentication to receive token!!
                                            success: true,
                                            message: 'Enjoy your token!',
                                            token: token
                                        });
                                    }
                                }
                            );
                        }
                    });
                }
            }
        );
    }
};

// Accounts API
// Local Gimmi account
exports.updateLocalPassword = function (req, res, next) {
    if (req.body.pw) {
        Person.findById(req.params.id, function (err, person) {  //find person with the corresponding ID
            if (err) return next(err);
            if (!person.accounts.local) { // if person doesn't have a local account: add a local account with password
                person.accounts.local = { "password": req.body.pw };
            } else { // if person has local account: update password
                person.accounts.local.password = req.body.pw;
            }
            person.markModified('accounts.local.password');
            person.save(function (err, person, numAffected) {
                if (err) return next(err);
                res.status(200).json(person);
            });
        });

    } else {
        return next("No password provided");
    }
};
/**
 * Reset password of Gimmi account.
 * @param email The emailadress of the person who wants to reset his/her password.
 */
exports.resetPassword = function (req, res, next) {
    if (req.body.email) {
        var email = req.body.email;
        Person.findOne({email : email}, function (err, person) {  //find person with the corresponding email
            if (err) return next(err);
            if (!person) {
                res.status(404).json({
                    error: "not found"
                });
            } else {
                var token = createRandomToken();
                person.accounts.local.resetPasswordToken = token;
                person.accounts.local.resetPasswordExpires = new Date(Date.now() + (1*60*60*1000)); // 1 hour

                person.markModified('accounts.local.resetPasswordToken');
                person.markModified('accounts.local.resetPasswordExpires');
                person.save(function (err, person, numAffected) {
                    if (err) return next(err);
                    console.log("Password has been reset for person " + person._id);
                    Mail.sendLocal(person.email, "[GIMMI] Paswoord reset aangevraagd voor uw account", "<p>Je ontvangt deze mail omdat iemand een reset van je paswoord op http://www.gimmi.be heeft aangevraagd. " +
                        "Klik op onderstaande link om je paswoord te resetten (deze link is 1 uur geldig): <br />" +
                        "http://www.gimmi.be/#/reset/" + token +
                        "Als je zelf geen paswoord reset hebt aangevraagd, gelieve deze mail te negeren. Uw paswoord blijft ongewijzigd.");
                    res.status(200).json();
                });
            }
        });
    }
}

// Facebook account
exports.deleteFacebookAccount = function (req, res, next) {
    Person.findByIdAndUpdate(req.params.id, { $unset: { "accounts.facebook": "" } }, { new: true }, function (err, person) {
        if (err) return next(err);

        var token = null;
        var personObj = person.toObject(); // Convert het MongoDB object naar een gewoon Javascript object

        if (personObj.accounts.local) {
            personObj.loginStrategy = "local"; //Add loginStrategy to person object
            token = createJWTtoken(personObj); // Creëer een nieuwe token
        }

        res.status(200).json(token); // Stuur de nieuwe token als response van de call
    });
};

///////////////////////
// Private functions //
///////////////////////
function createRandomToken() {
    return crypto.randomBytes(20).toString('hex');
}

function createJWTtoken(person) {
    // Create a token
    return jwt.sign(person, config.jwt_secret, {
        expiresIn: "720h" // expires after 30 days
    });
}