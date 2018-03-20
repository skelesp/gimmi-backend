var communicationRouter = require('express').Router();
var Mail = require('./class');

// --- Communication API routes ---

communicationRouter.route('/')
    .post(Mail.sendViaAPI)
;

module.exports = communicationRouter;