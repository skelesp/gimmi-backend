var peopleRouter = require('express').Router();
var jwt = require('jsonwebtoken');
var Person = require('./class');

// --- Person API routes ---

peopleRouter.route('/')
    .get(Person.getAll)
    .post(Person.register);

peopleRouter.route('/:id')
    .get(Person.get)
    .put(Person.update)
    .delete();

// Accounts API
// Local Gimmi account
peopleRouter.route('/:id/account/local')
    .put(Person.updateLocalPassword);

// Facebook account
peopleRouter.route('/:id/account/facebook')
    .delete(Person.deleteFacebookAccount);

module.exports = peopleRouter;