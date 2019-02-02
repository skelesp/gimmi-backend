var imageRouter = require('express').Router();
var cloudinaryAPI = require('./controller');

imageRouter.route('/signature')
    .post(cloudinaryAPI.generateSignature);
imageRouter.route('/migrateOldImages')
    .put(cloudinaryAPI.migrate);
imageRouter.route('/')
    .post(cloudinaryAPI.uploadImage);
imageRouter.route('/:public_id')
    .delete(cloudinaryAPI.deleteImage);
imageRouter.route('/:public_id/public_id')
    .put(cloudinaryAPI.renameImage);

module.exports = imageRouter;