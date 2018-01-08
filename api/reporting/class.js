var router = require('express').Router();
var Person = require('../people/model');
var config = require('../../config');
var async = require('async');
var _ = require('lodash');

exports.getLeanstartupData = function(req, res, next) {
    async.parallel([
        function(callback) {
            getRegistrationData(function(err, reportData){
                if (err) { return callback(err);}
                callback(null, reportData);
            });
        },
        function (callback) {
            getActivationData(function (err, reportData) {
                if (err) { return callback(err); }
                callback(null, reportData);
            });
        }
    ], function(err, results) {
        // Results = array of results from parallel calls
        var startDate = new Date(2016, 10, 1);
        var labels = generatePeriodLabels(startDate);
        var data = generateLeanStartupData(labels, results);
        
        // Last month is running month
        labels[labels.length-1] += "**";        

        // Send response
        res.status(200).json({
            data: data,
            labels: labels,
            series: ['Registered', 'Activated']
        });
    });
};

function generateLeanStartupData (labels, results){
    var registrationResults = [];
    var activationResults = [];
    var registrationCount = 0;
    var activationCount = 0;

    labels.forEach(function(value, index){
        var registrationIndex = results[0].months.indexOf(value);
        var activationIndex = results[1].months.indexOf(value);

        if ( registrationIndex !== -1 ) {
            // Registration result found
            registrationCount += results[0].registered[registrationIndex];
        } 
        registrationResults[index] = registrationCount;

        if ( activationIndex !== -1 ) {
            // Activation result found
            activationCount += results[1].activated[activationIndex];
        }
        activationResults[index] = activationCount;
    });

    return [registrationResults, activationResults] ;
}

function generatePeriodLabels(startDate, numberOfPeriods){
    // Check number of periods
    if (numberOfPeriods > 0) { // Running period with fixed number of periods
        startDate.setMonth(startDate.getMonth() - numberOfPeriods);
    } else { // Period from startDate to now (dynamically count periods)
        numberOfPeriods = monthDiff(startDate, new Date()) + 2; // Diff between start and now + startmonth + currentMonth
    }

    // Initialize variables
    var year = startDate.getFullYear();
    var month = startDate.getMonth() + 1;
    var reportLabels = [];

    // Loop through all periods and add labels to array
    for (i = 0; i < numberOfPeriods; i++) {
        // Push label to array
        reportLabels.push(year + "/" + _.padStart(month.toString(), 2, "0"));
        
        // Change year if 12th month is reached
        if (month === 12) { 
            year++;
            month = 1;
        } else {
            month++;
        }
    }

    return reportLabels;
};

function getActivationData (callback){
    // Get activation data
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
        if (err) { callback(err); }
        
        var months = [];
        var activated = [];
        
        data.forEach(record => {
            months.push(record.month);
            activated.push(record.activated);
        });
        var reportData = {
            months: months,
            activated: activated
        }
        callback(null, reportData);
    });
};

function getRegistrationData (callback){
    
    // Get registration data
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
    ]).exec(function (err, data) {
        if (err) { callback(err); }
        var months = [];
        var registered = [];
        
        data.forEach(record => {
            months.push(record.month);
            registered.push(record.registered)
        });

        var reportData = {
            months: months,
            registered: registered
        }
        callback(null, reportData);
    });
};

function monthDiff(d1, d2) {
    var months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth() + 1;
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
}