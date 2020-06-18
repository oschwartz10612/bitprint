const functions = require('firebase-functions');

const coinbaseWebhook = require('./webhooks/coinbase.webhook.js');
const stripeWebhook = require('./webhooks/stripe.webhook.js');
const stripeCreateCharge = require('./charges/stripe.createCharge.js');
const coinbaseCreateCharge = require('./charges/coinbase.createCharge.js');
const buildOrders = require('./firestore_functions/firestore.buildOrder.js');

if (process.env.NODE_ENV === "development") {
  firebase.functions().useFunctionsEmulator("http://localhost:8080");
}

const runtimeOpts = {
  timeoutSeconds: 300,
};

exports.stripeWebhook = functions.https.onRequest(stripeWebhook);
exports.coinbaseWebhook = functions.https.onRequest(coinbaseWebhook);
exports.buildOrders = functions.runWith(runtimeOpts).firestore.document("orders/{orderId}").onCreate(buildOrders);
exports.stripeCreateCheckout = functions.https.onCall(stripeCreateCharge);
exports.createCharge = functions.https.onCall(coinbaseCreateCharge);













