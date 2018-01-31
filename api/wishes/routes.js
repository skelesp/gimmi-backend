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

// --- Reservation API routes ---
wishRouter.route('/:id/reservation')
    .post(Wish.reserve)
    .delete(Wish.unreserve);

module.exports = wishRouter;