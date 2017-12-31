var reportingRouter = require('express').Router();
var Reporting = require('./class');

reportingRouter.route('/leanstartup/activation')
    .get(Reporting.getActivationData);

module.exports = reportingRouter;