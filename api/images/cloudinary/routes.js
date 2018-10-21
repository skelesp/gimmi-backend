var router = require('express').Router();
var cloudinaryAPI = require('./class');

router.post('/signature/', cloudinaryAPI.generateSignature);

router.put('/migrateOldImages/', cloudinaryAPI.migrate);

module.exports = router;