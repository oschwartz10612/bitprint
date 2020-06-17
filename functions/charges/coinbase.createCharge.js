const { db } = require("../admin");
const functions = require('firebase-functions');

var coinbase = require("coinbase-commerce-node");
var Client = coinbase.Client;
var Charge = coinbase.resources.Charge;
Client.init(functions.config().coinbase.key);

const coinbaseCreateCharge = async (data, context) => {
  var form = data.form;

  var user = await db.doc(`users/${context.auth.uid}`).get();
  if (!user.exists) {
    functions.https.HttpsError(
      "failed-precondition",
      "The function must be called by an authorized use"
    );
  }
  user = user.data();

  var chargeData = {
    name: `${form.firstName} ${form.lastName}`,
    description: "Bitprint Card Order",
    local_price: {
      amount: `${user.totalCost}`,
      currency: "USD",
    },
    pricing_type: "fixed_price",
  };

  var response = await Charge.create(chargeData).catch((err) => {
    console.log(err);
    throw new functions.https.HttpsError("failed-precondition", err);
  });

  admin
    .firestore()
    .doc(`users/${context.auth.uid}`)
    .update({
      shippingAddress: form,
      paymentEndpoint: {
        uri: response.hosted_url,
        id: response.id,
        code: response.code,
      },
      paymentStatus: "created",
    });

  return { uri: response.hosted_url };
}

module.exports = coinbaseCreateCharge;
