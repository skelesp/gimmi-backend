var cloudinary = require('cloudinary');
var router = require('express').Router();
var config = require('../../config');

router.post('/signature/', function (req, res) {
    //https://support.cloudinary.com/hc/en-us/articles/203817991-How-to-generate-a-Cloudinary-signature-on-my-own-
    //https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
    var params_to_sign = req.body ? req.body : {};
    var secret = process.env.CLOUDINARY_SECRET;
    var signature = cloudinary.utils.api_sign_request(params_to_sign, secret);
    res.json(signature);
});

module.exports = router;