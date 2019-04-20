var Wish = require('./model');
var _ = require('lodash');

// --- Wish class ---
// Create a wish
exports.create = function (req, res, next) {
    var wish = new Wish({
        title: req.body.title,
        price: parseInt(req.body.price, 10) || null,
        url: req.body.url,
        image: req.body.image,
        size: req.body.size,
        color: req.body.color,
        description: req.body.description,
        amountWanted: req.body.amountWanted,
        receiver: req.body.receiver,
        createdBy: req.body.createdBy,
        copyOf: req.body.copyOf
    });
    wish.save(function (err, wish) {
        if (err) {
            console.log(err);
            return next(err);
        }
        Wish.populate(wish, { path: "createdBy", select: { 'accounts': 0, 'email': 0 } }, function (err, wish) {
            res.status(201).json(wish)
        });
    })
};

// Get a wish
exports.get = function (req, res, next) {
    Wish.find({ _id: req.params.id })
        .populate('createdBy reservation.reservedBy', 'firstName lastName')
        .exec(function (err, result) {
            if (err) return next(err);
            res.status(200).json(result);
        });
};

// Update a wish
exports.update = function (req, res, next) {
    var wish = convertNovalueToUndefined(req.body);
    Wish.findOneAndUpdate({ _id: req.params.id }, wish, { new: true })
        .populate('createdBy reservation.reservedBy', 'firstName lastName')
        .exec(function (err, doc) {
            if (err) { res.send({ msg: 'Wish not found' }, 404) }
            res.status(201).json(doc);
        });
};

// Close a wish
exports.close = function (req, res, next) {
    var closure = req.body;
    var wishID = req.params.id;
    Wish.findOneAndUpdate({ _id: wishID }, { closure: closure },
        { new: true })
        .populate('createdBy', 'firstName lastName')
        .populate('reservation.reservedBy', 'firstName lastName')
        .exec(function (err, doc) {
            if (err) { res.send({ msg: 'Adding closure failed' }, 404); }
            res.status(201).json(doc);
        });
}

// Delete a wish
exports.delete = function (req, res, next) {
    Wish.findByIdAndRemove(req.params.id, function (err, post) {
        if (err) return next(err)
        res.status(201).json(post)
    })
};

// --- Reservation class --
// Reserve a wish
exports.reserve = function (req, res, next) {
    Wish.findOneAndUpdate({ _id: req.params.id },
        {
            reservation: {
                reservedBy: req.body.reservedBy,
                amount: req.body.amount,
                reservationDate: req.body.reservationDate,
                reason: req.body.reason,
                handoverDate: req.body.handoverDate
            }
        },
        { new: true })
        .populate('createdBy', 'firstName lastName')
        .populate('reservation.reservedBy', 'firstName lastName')
        .exec(function (err, doc) {
            if (err) { res.send({ msg: 'Reservation failed' }, 404); }
            res.status(201).json(doc);
        });
};

// Unreserve a wish
exports.unreserve = function (req, res, next) {
    Wish.findOneAndUpdate({ _id: req.params.id }, { $unset: { reservation: "" } }, { new: true })
        .populate('createdBy', 'firstName lastName')
        .exec(function (err, doc) {
            if (err) { res.send({ msg: 'Reservation delete failed' }, 404); }
            res.status(201).json(doc);
        });
};

// --- Feedback class ---
exports.addFeedback = function(req, res, next)  {
    var feedback = req.body;
    var wishID = req.params.id;
    Wish.findOneAndUpdate({ _id: wishID },{ giftFeedback: feedback },
        { new: true })
        .populate('createdBy', 'firstName lastName')
        .populate('reservation.reservedBy', 'firstName lastName')
        .exec(function (err, doc) {
            if (err) { res.send({ msg: 'Adding feedback failed' }, 404); }
            res.status(201).json(doc);
        });
}
exports.deleteFeedback = function (req, res, next) {
    Wish.findOneAndUpdate({ _id: req.params.id }, { $unset: { giftFeedback: "" } }, { new: true })
        .populate('createdBy', 'firstName lastName')
        .populate('reservation.reservedBy', 'firstName lastName')
        .exec(function (err, doc) {
            if (err) { res.send({ msg: 'Reservation delete failed' }, 404); }
            res.status(201).json(doc);
        });
}
// --- State ---
exports.calculateState = function (req, res, next) {
    Wish.findOne({ _id: req.params.id })
        .exec(function (err, doc) {
            if (err) { res.send({ msg: 'Wish not found' }, 404); }
            var wishWithState = setWishStatus(doc);
            var state = wishWithState.state;
            res.status(201).json(state);
        });
}

// Private functions
function convertNovalueToUndefined(object) {
    return _.mapValues(object, function (value) {
        if (value === "#*/NO_VALUE/*#") {
            return value = undefined;
        } else {
            return value;
        }
    });
}
function setWishStatus(wish) {
    var now = new Date();
    if (wish.closure) {
        wish.state = "Closed";
    } else if (wish.reservation && wish.reservation.handoverDate < now) {
        wish.state = "Received";
    } else if (wish.reservation && !wish.closure) {
        wish.state = "Reserved";
    } else {
        wish.state = "Open";
    }
    return wish;
}