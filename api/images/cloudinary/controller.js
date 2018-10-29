/**
 * Cloudinary controller for image API
 */

var Wish = require("../../wishes/model");
var async = require('async');
var urlExists = require('url-exists');
var cloudinary = require('cloudinary');
var secret = process.env.CLOUDINARY_SECRET;
var cloudinary_api_key = process.env.CLOUDINARY_API_KEY;
var cloudinary_cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
var upload_preset = 'wish_images';

cloudinary.config({
    cloud_name: cloudinary_cloud_name,
    api_key: cloudinary_api_key,
    api_secret: secret
});

// EXPORTS
exports.generateSignature = function (req, res, next) {
    //https://support.cloudinary.com/hc/en-us/articles/203817991-How-to-generate-a-Cloudinary-signature-on-my-own-
    //https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
    var params_to_sign = req.body ? req.body : {};
    var signature = cloudinary.utils.api_sign_request(params_to_sign, secret);
    res.status(201).json(signature);
}

/**
 * Migration script to upgrade old URL based images to cloudinary images
 */
var UploadedToCloudinary = [];
var BrokenLinks = [];
var DefaultImages = [];
var failedUploadsToCloudinary = [];
var allLinks = [];
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
exports.deleteImage = function (req, res, next) {
    var public_id = decodeURI(req.params.public_id);
    var options = {
        invalidate: true
    }
    cloudinary.v2.uploader.destroy(public_id, options, function(error, result){
        if (error) {
            next(error.message);
        }
        if (result.result === "ok") {
            console.log("Verwijderde afbeelding: " + public_id);
            res.status(200).json({delete: "ok"});
        } else {
            next(result.result);
        }
    });
}
exports.renameImage = function (req, res, next) {
    var public_id = decodeURI(req.params.public_id); // Get public_id from URL
    var folder = splitFolderAndIdFromPublicId(public_id).folder; // Get folder from public_id
    var new_id = folder ? folder + req.body.new_public_id : req.body.new_public_id; // Add folder to new image name
    var options = {
        overwrite: true,
        invalidate: true
    }
    cloudinary.v2.uploader.rename(public_id, new_id, options, function (error, result) {
        if (error) {
            next(error.message);
        }
        if (result) {
            res.status(200).json(result);
        }
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
    var upload_options = {
        public_id: wishID,
        upload_preset: upload_preset
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
function splitFolderAndIdFromPublicId (public_id){
    var res = public_id.split("/");
    var id = res[res.length - 1];
    res.pop();
    var folder = res.join("/");
    folder = (folder === "") ? null : (folder + "/");
    return {
        id: id,
        folder: folder
    }
}