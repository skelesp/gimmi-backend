var db = require('../../db');

var reservationSchema = new db.Schema({
  reservedBy: {type: db.Schema.Types.ObjectId, ref:'Person', required: false},
  amount: {type: Number, required: true},
  reservationDate: {type: Date, required: true},
  reason: {type: String, required: false},
  hideUntil: {type: Date, required: false}
});

var WishSchema = new db.Schema(
  {
    title: {type: String, required: true},
    price: {type: Number, required: false},
    url: {type: String, required: false},
    image: {type: {
      public_id: { type: String, require: true},
      version: { type: String, required: true}
    }, required: false},
    color: {type: String, required: false},
    size: {type: String, required: false},
    description: {type: String, required: false},
    amountWanted: {type: Number, default: 1},
    receiver: {type: db.Schema.Types.ObjectId, ref:'Person', required: true},
    createdBy: {type: db.Schema.Types.ObjectId, ref:'Person', required: true},
    reservation: {type: reservationSchema, required: false},
    copyOf: { type: db.Schema.Types.ObjectId, ref:"Wish", required: false}
  },
  {
    timestamps: true
  }
);
var Wish = db.model('Wish', WishSchema);

module.exports = Wish;