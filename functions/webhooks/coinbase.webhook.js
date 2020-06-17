const { db } = require("../admin");
const functions = require('firebase-functions');

const DateFormatter = require("./date_formatter");

var coinbase = require("coinbase-commerce-node");
var Client = coinbase.Client;
var Webhook = coinbase.Webhook;
Client.init(functions.config().coinbase.key);

const sgMail = require("@sendgrid/mail");
const API_KEY = functions.config().sendgrid.key;
const TEMPLATE_ID = functions.config().sendgrid.template;
sgMail.setApiKey(API_KEY);

const coinbaseWebhook = async (request, response) => {
  var event;
  var id = request.body.event.data.id;
  var code = request.body.event.data.code;
  var type = request.body.event.type.split(":")[1];

  try {
    event = Webhook.verifyEventBody(
      request.rawBody,
      request.headers["x-cc-webhook-signature"],
      functions.config().coinbase.webhook
    );
  } catch (error) {
    console.warn("Error occured", error.message);

    return response.status(400).send("Webhook Error:" + error.message);
  }

  var users = await db
    .collection("users")
    .where("paymentEndpoint.id", "==", id)
    .get();

  if (users.empty) {
    console.log("No matching documents.");
    return;
  }

  console.log(id);

  var userFound = false;
  var user;

  users.forEach((doc) => {
    userRef = doc.data();
    console.log(userRef);

    if (userRef.paymentEndpoint.id == id) {
      user = userRef;
      userFound = true;
    } else {
      console.warn("Incorrect user");
    }
  });

  if (!userFound) {
    console.warn("User not found");
    return response.status(500).send("Could not find user" + event.id);
  }

  if (type == "confirmed") {
    db.doc(`orders/${user.paymentEndpoint.code}`).set({
      order: user.cart,
      uid: user.uid,
      timestamp: DateFormatter.getDate(),
      shippingAddress: user.shippingAddress,
      total: user.totalCost,
      code: user.paymentEndpoint.code,
    });

    db.doc(`users/${user.uid}`).update({
      order: user.cart,
      cart: [],
      totalCost: 0,
      paymentStatus: type,
    });

    const msg = {
      to: user.shippingAddress.email,
      from: {
        email: "orders@bitprint.io",
        name: "Bitprint Orders",
      },
      reply_to: {
        email: "support@bitprint.io",
        name: "Bitprint Support",
      },
      templateId: TEMPLATE_ID,
      dynamic_template_data: {
        name: user.shippingAddress.firstName,
        receipt: `https://commerce.coinbase.com/receipts/${user.paymentEndpoint.code}`,
        code: user.paymentEndpoint.code,
      },
    };

    await sgMail.send(msg);
  } else {
    db.doc(`users/${user.uid}`).update({
      paymentStatus: type,
    });
  }

  //send an email or something here

  console.log("Success", event.id);

  response.status(200).send("Signed Webhook Received: " + event.id);
};

module.exports = coinbaseWebhook;
