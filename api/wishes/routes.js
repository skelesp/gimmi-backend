var wishRouter = require('express').Router();
var jwt = require('jsonwebtoken');
var Wish = require('./class');

// --- Wish API routes ---

wishRouter.route('/')
    .post(Wish.create);
wishRouter.route('/:id')
    .get(Wish.get)
    .put(Wish.update)
    .delete(Wish.delete);
wishRouter.route('/:id/feedback')
    .post(Wish.addFeedback)
    .put(Wish.addFeedback)
    .delete(Wish.deleteFeedback);
wishRouter.route('/:id/closure')
    .post(Wish.close);
// --- Reservation API routes ---
wishRouter.route('/:id/reservation')
    .post(Wish.reserve)
    .delete(Wish.unreserve);
    // --
wishRouter.route('/:id/state')
    .get(Wish.calculateState);

module.exports = wishRouter;