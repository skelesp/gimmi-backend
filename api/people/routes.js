var peopleRouter = require('express').Router();
var jwt = require('jsonwebtoken');
var Person = require('./class');

// --- Person API routes ---

peopleRouter.route('/')
    .get(Person.getAll)
    .post(Person.register);

peopleRouter.route('/:id')
    .get(Person.getByID)
    .put(Person.update)
    .delete();
peopleRouter.route('/email/:email')
    .get(Person.getByEmail);

// Accounts API
// Local Gimmi account
peopleRouter.route('/:id/account/local')
    .put(Person.updateLocalPassword);

// Facebook account
peopleRouter.route('/:id/account/facebook')
    .delete(Person.deleteFacebookAccount);

module.exports = peopleRouter;