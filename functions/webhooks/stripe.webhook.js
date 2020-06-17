const { db } = require("../admin");
const functions = require('firebase-functions');

const DateFormatter = require("./date_formatter");

const sgMail = require("@sendgrid/mail");
const API_KEY = functions.config().sendgrid.key;
const TEMPLATE_ID = functions.config().sendgrid.template;
sgMail.setApiKey(API_KEY);

const Stripe = require("stripe");
const { strictEqual } = require("assert");
const stripe = new Stripe(functions.config().stripe.key);
const webhookSecret = functions.config().stripe.websec;

const stripeWebhook = async (request, response) => {
  const sig = request.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.rawBody, sig, webhookSecret);
  } catch (error) {
    console.warn("Failed to parse secret");
    response.status(400).end();
    return;
  }

  console.log(event.type);
  if (event.type == "checkout.session.completed") {
    const user = (
      await admin
        .firestore()
        .doc(`users/${event.data.object.client_reference_id}`)
        .get()
    ).data();

    db.doc(`orders/${event.data.object.payment_intent}`).set({
      order: user.cart,
      uid: user.uid,
      timestamp: DateFormatter.getDate(),
      shippingAddress: user.shippingAddress,
      total: user.totalCost,
      code: event.data.object.payment_intent,
      customer: event.data.object.customer,
    });

    db.doc(`users/${user.uid}`).update({
      order: user.cart,
      cart: [],
      totalCost: 0,
      paymentStatus: "completed",
      customerId: event.data.object.customer,
    });
  } else if (event.type == "payment_intent.succeeded") {
    const id = event.data.object.charges.data[0].payment_intent;

    var users = await admin
      .firestore()
      .collection("users")
      .where("paymentEndpoint.id", "==", id)
      .get();

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

    admin
      .firestore()
      .doc(`users/${user.uid}`)
      .update({
        paymentEndpoint: {
          receiptUri: event.data.object.charges.data[0].receipt_url,
        },
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
        receipt: event.data.object.charges.data[0].receipt_url,
        code: id,
      },
    };

    await sgMail.send(msg);
  }

  response.json({ received: true });
}

module.exports = stripeWebhook;
