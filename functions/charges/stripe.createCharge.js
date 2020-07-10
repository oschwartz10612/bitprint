const { db } = require("../admin");
const functions = require("firebase-functions");

const Stripe = require("stripe");
const { Stream } = require("stream");
const stripe = new Stripe(functions.config().stripe.key);

const stripeCreateCharge = async (data, context) => {
  var form = data.form;

  var user = await db.doc(`users/${context.auth.uid}`).get();
  if (!user.exists) {
    functions.https.HttpsError(
      "failed-precondition",
      "The function must be called by an authorized use"
    );
  }
  user = user.data();

  let line_items = [];
  user.cart.forEach(item => {

    var price = item.price;
    user.promos.forEach(promo => {
      if (item.price == promo.oldPrice) {
        price = promo.newPrice;
      }
    });

    line_items.push({
      price: price,
      quantity: 1
    })
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: line_items,
    client_reference_id: context.auth.uid,
    customer_email: form.email,
    mode: "payment",
    success_url: "http://bitprint.io/success",
    cancel_url: "http://bitprint.io/checkout",
  });

  db.doc(`users/${context.auth.uid}`).update({
    shippingAddress: form,
    paymentEndpoint: {
      id: session.payment_intent,
    },
    paymentStatus: "created",
  });

  return { sessionId: session.id };
};

module.exports = stripeCreateCharge;
