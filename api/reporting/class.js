var router = require('express').Router();
var Person = require('../people/model');
var config = require('../../config');

exports.getActivationData = function(req, res, next) {
    Person.aggregate([
        {
            $match:
                {}
        },
        {
            $project:
                {
                    _id: "$_id",
                    name: { $concat: ["$firstName", " ", "$lastName"] },
                    joinMonth: {
                        $concat: [
                            { $substr: ["$createdAt", 0, 4] },
                            "/",
                            { $substr: ["$createdAt", 5, 2] }
                        ]
                    }
                }
        },
        {
            $lookup:
                {
                    from: "wishes",
                    localField: "_id",
                    foreignField: "createdBy",
                    as: "createdWishes"
                }
        },
        {
            $lookup:
                {
                    from: "wishes",
                    localField: "_id",
                    foreignField: "reservation.reservedBy",
                    as: "reservedWishes"
                }
        },
        {
            $project:
                {
                    name: "$name",
                    joinMonth: "$joinMonth",
                    createdWishes: { $ifNull: ["$createdWishes", []] },
                    reservedWishes: "$reservedWishes"
                }
        },
        {
            $addFields:
                {
                    numberOfCreatedWishes: { $size: "$createdWishes" },
                    numberOfReservedWishes: { $size: "$reservedWishes" }
                }
        },
        {
            $addFields:
                {
                    performedAction: {
                        $cond: {
                            if: { $or: [{ $gt: ["$numberOfCreatedWishes", 0] }, { $gt: ["$numberOfReservedWishes", 0] }] },
                            then: true,
                            else: false
                        }
                    }
                }
        },
        {
            $sort:
                {
                    "createdWishes.createdAt": 1
                }
        },
        {
            $project:
                {
                    _id: "$_id",
                    name: "$name",
                    joinMonth: "$joinMonth",
                    /*createdWishes: "$createdWishes",*/
                    firstCreation: {
                        $let: {
                            "vars": { "firstWishCreation": { $arrayElemAt: ["$createdWishes", 0] } },
                            "in": "$$firstWishCreation.createdAt"
                        }
                    },
                    /*reservedWishes: "$reservedWishes",*/
                    firstReservation: {
                        $let: {
                            "vars": { "firstWishReservation": { $arrayElemAt: ["$reservedWishes", 0] } },
                            "in": "$$firstWishReservation.createdAt"
                        }
                    },
                    numberOfCreatedWishes: "$numberOfCreatedWishes",
                    numberOfReservedWishes: "$numberOfReservedWishes",
                    performedAction: "$performedAction"
                }
        }
    ]).exec(function(err, data) {
        if (err) { return next(err); }
        res.status(200).json(data);
    });
};
