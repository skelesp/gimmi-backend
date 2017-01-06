var db = require('../db')

var WishSchema = new db.Schema(
  {
    title: {type: String, required: true},
    price: {type: Number, required: false},
    url: {type: String, required: false},
    image: {type: String, required: false},
    status: {type: String, default: "free"},
    receiver: {type: db.Schema.Types.ObjectId, ref:'Person', required: true},
    createdBy: {type: db.Schema.Types.ObjectId, ref:'Person', required: true},
    reservedBy: {type: db.Schema.Types.ObjectId, ref:'Person', required: false}
  },
  {
    timestamps: true
  }
);
var Wish = db.model('Wish', WishSchema);

module.exports = Wish;
