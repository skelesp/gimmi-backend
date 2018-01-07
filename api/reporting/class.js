var router = require('express').Router();
var Person = require('../people/model');
var config = require('../../config');

exports.getLeanstartupData = function(req, res, next) {
    Person.aggregate([
        {
            $project:
                {
                    _id: "$_id",
                    name: { $concat: ["$firstName", " ", "$lastName"] },
                    registrationMonth: {
                        $concat: [
                            { $substr: ["$createdAt", 0, 4] },
                            "/",
                            { $substr: ["$createdAt", 5, 2] }
                        ]
                    }
                }
        },
        {
            $project:
                {
                    _id: "$_id",
                    registrationMonth: "$registrationMonth"
                }
        },
        {
            $group:
                {
                    _id: "$registrationMonth",
                    registered: { $sum: 1 }
                }
        },
        {
            $sort:
                {
                    "_id": 1
                }
        },
        {
            $project:
                {
                    _id: 0,
                    month: "$_id",
                    registered: "$registered"
                }
        },
        {
            $match:
                {
                    month: { $ne: "/" }
                }
        }
    ]).exec(function(err, data) {
        if (err) { return next(err); }
        var months = [];
        var registered = [];
        
        data.reduce((sum, value, i) => {
            return registered[i] = sum + value.registered;    
        }, 0);
        data.forEach(function(record){
            months.push(record.month);
        });

        var reportData = {
            months: months,
            registered: registered
        }
        res.status(200).json(reportData);
    });
};
exports.getActivationData = function (req, res, next) {
    Person.aggregate([
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
            $project:
                {
                    name: "$name",
                    registrationMonth: "$registrationMonth",
                    createdWishes: { $ifNull: ["$createdWishes", []] }
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
                    firstCreationMonth: {
                        $let: {
                            "vars": { "firstWishCreation": { $arrayElemAt: ["$createdWishes", 0] } },
                            "in": {
                                $concat: [
                                    { $substr: ["$$firstWishCreation.createdAt", 0, 4] },
                                    "/",
                                    { $substr: ["$$firstWishCreation.createdAt", 5, 2] }
                                ]
                            }
                        }
                    }
                }
        },
        {
            $group:
                {
                    _id: "$firstCreationMonth",
                    activated: { $sum: 1 }
                }
        },
        {
            $sort:
                {
                    "_id": 1
                }
        },
        {
            $project:
                {
                    _id: 0,
                    month: "$_id",
                    activated: "$activated"
                }
        },
        {
            $match:
                {
                    month: { $ne: "/" }
                }
        }
    ]).exec(function (err, data) {
        if (err) { return next(err); }
        
        var months = [];
        var activated = [];
        data.forEach(record => {
            months.push(record.month);
            activated.push(record.activated);
        });
        var report = {
            months: months,
            activated: activated
        }
        res.status(200).json(report);
    });
};