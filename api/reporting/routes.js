var reportingRouter = require('express').Router();
var Reporting = require('./class');

reportingRouter.route('/leanstartup')
    .get(Reporting.getLeanstartupData);

module.exports = reportingRouter;