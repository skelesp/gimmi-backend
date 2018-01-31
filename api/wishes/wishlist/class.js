var Wish = require('../model');
var Person = require('../../people/model');
var mongoose = require('mongoose');

// Get a wishlist of a person
exports.getWishlist = function (req, res, next) {
    Wish
    .aggregate([
        { $match: { receiver: new mongoose.Types.ObjectId(req.params.receiverId) } },
        {
            $lookup: { //Opgelet:virtuals worden hier niet meegenomen, dus als 'fullname' van een person nodig zou zijn hier, moet dit toegevoegd worden in één van de volgende stages
                from: "people",
                localField: "createdBy",
                foreignField: "_id",
                as: "creator"
            }
        },
        {
            $lookup: { //Opgelet:virtuals worden hier niet meegenomen, dus als 'fullname' van een person nodig zou zijn hier, moet dit toegevoegd worden in één van de volgende stages
                from: "people",
                localField: "receiver",
                foreignField: "_id",
                as: "receiver"
            }
        },
        { $unwind: "$creator" },
        { $unwind: "$receiver" },
        {
            $group: {
                _id: { receiver: "$receiver" },
                wishes: {
                    $push: {
                        _id: "$_id",
                        title: "$title",
                        image: "$image",
                        price: "$price",
                        url: "$url",
                        createdAt: "$createdAt",
                        createdBy: "$creator",
                        reservation: "$reservation",
                        copyOf: "$copyOf"
                    }
                },
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                "wishes.createdBy": { "email": 0, "accounts": 0 },
                "_id.receiver": { "email": 0, "accounts": 0 },
            }
        }
    ]).exec(function (err, wishlist) {
        if (err) { return next(err) }
        if (!Array.isArray(wishlist) || !wishlist.length) {
            Person.findById(req.params.receiverId, { accounts: 0, email: 0, createdAt: 0, updatedAt: 0 }, function (err, person) {
                wishlist = [{
                    _id: { receiver: person },
                    count: 0,
                    wishes: []
                }];
                res.json(wishlist);
            });
        } else {
            res.json(wishlist);
        }
    });
};

exports.getListOfCopies = function (req, res, next){
    Wish
    .find({ receiver: new mongoose.Types.ObjectId(req.params.receiverId) , "copyOf": { $exists: true } })
    .exec(function(err, result){
        if (err) return next(err);
        res.status(200).json(result);
    });
};