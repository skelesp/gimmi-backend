var wishlistRouter = require('express').Router();
var Wishlist = require('./class');

// --- Person API routes ---

wishlistRouter.route('/:receiverId')
    .get(Wishlist.getWishlist);
wishlistRouter.route('/:receiverId/copies')
    .get(Wishlist.getListOfCopies);
    
module.exports = wishlistRouter;