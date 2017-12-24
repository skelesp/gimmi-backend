var wishlistRouter = require('express').Router();
var Wishlist = require('./class');

// --- Person API routes ---

wishlistRouter.route('/:receiverId')
    .get(Wishlist.getWishlist);
    
module.exports = wishlistRouter;