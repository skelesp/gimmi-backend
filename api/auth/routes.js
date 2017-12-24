var authRouter = require('express').Router();
var Person = require('../people/class');

// --- Person API routes ---

authRouter.route('/')
    .post(Person.authenticate);

module.exports = authRouter;