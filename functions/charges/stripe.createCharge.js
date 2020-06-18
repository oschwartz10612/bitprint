const { db } = require("../admin");
const functions = require("firebase-functions");

const Stripe = require("stripe");
const { Stream } = require("stream");
const stripe = new Stripe(functions.config().stripe.key);

const stripeCreateCharge = async (data, context) => {
  var form = data.form;

  var user = await admin.firestore().doc(`users/${context.auth.uid}`).get();
  if (!user.exists) {
    functions.https.HttpsError(
      "failed-precondition",
      "The function must be called by an authorized use"
    );
  }
  user = user.data();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price: "price_HKlQAwsk8vOcbF",
        quantity: user.cart.length,
      },
    ],
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
