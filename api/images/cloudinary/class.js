var Wish = require("../../wishes/model");
var async = require('async');
var urlExists = require('url-exists');
var cloudinary = require('cloudinary');

cloudinary.config({
    cloud_name: 'hunk4smqo',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

var UploadedToCloudinary = [];
var BrokenLinks = [];
var DefaultImages = [];
var failedUploadsToCloudinary = [];
var allLinks = [];
var i = 0;
var secret = process.env.CLOUDINARY_SECRET;

// EXPORTS
exports.generateSignature = function (req, res, next) {
    //https://support.cloudinary.com/hc/en-us/articles/203817991-How-to-generate-a-Cloudinary-signature-on-my-own-
    //https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
    var params_to_sign = req.body ? req.body : {};
    var secret = process.env.CLOUDINARY_SECRET;
    var signature = cloudinary.utils.api_sign_request(params_to_sign, secret);
    res.status(201).json(signature);
}
exports.migrate = function (req, res, next) {
    Wish.find({ "image.version": { $exists: false } }, (err, wishesWithOldImage) => {
        async.each(wishesWithOldImage, convertOldImageToCloudinary, function(err) {
            if (err) {
                console.log(`ERROR occured --> Check logs`);
            }
            var summary = {
                uploaded: { total: UploadedToCloudinary.length, summary: UploadedToCloudinary},
                brokenLinks: { total: BrokenLinks.length, summary: BrokenLinks},
                defaultImages: { total: DefaultImages.length, summary: DefaultImages},
                failedUploadsToCloudinary: { total: failedUploadsToCloudinary.length, summary: failedUploadsToCloudinary},
                allLinks: {total: allLinks.length, summary: allLinks}
            }
            
            res.status(201).json(summary);
        });
    });
}
// FUNCTIONS
function convertOldImageToCloudinary (wish, callback) {
    var url = wish.image;
    var wishID = wish._id.toString();
    
    urlExists(url, function (err, exists) {
        if (err) {
            console.log(err);
        }
        allLinks.push(`${wishID} ==> ${url}`)
        if (!exists) {
            if (url.startsWith('/')) {
                DefaultImages.push(wishID);
                callback();
            } else {
                BrokenLinks.push(`${wishID} ==> ${url}`);;
                callback();
            }
        } else {
            uploadToCloudinary(url, wishID, (error) => {
                if (error) {
                    failedUploadsToCloudinary.push(`${wishID} ==> ${error.message}`);
                } else {
                    UploadedToCloudinary.push(wishID);
                }
                callback();
            });
        }
    });
}

function uploadToCloudinary (url, wishID, callback) {
    var upload_preset = 'wish_images';
    var upload_options = {
        public_id: wishID,
        upload_preset: 'wish_images'
    }

    cloudinary.v2.uploader.upload(url, upload_options,
        function (error, result) {
            if (error) {
                callback(error);
            }
            if (result) {
                Wish.findOneAndUpdate(
                    { _id: wishID}, 
                    {image: {
                        public_id: result.public_id, 
                        version: result.version
                    }},
                    {new: true}, 
                    (err, result) => {
                        callback(null);
                });
            }
        }
    );
}