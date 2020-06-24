const { db } = require("../admin");
const functions = require('firebase-functions');

const sgMail = require("@sendgrid/mail");
const API_KEY = functions.config().sendgrid.key;
const TEMPLATE_ID = functions.config().sendgrid.shippingtemplate;
sgMail.setApiKey(API_KEY);

const shippingWebhook = async (request, response) => {
    response.status(200);
    var respMsg = 'Email sent successfully.';

    const uid = request.query.uid;
    const token = request.query.token;

    var users = await db
      .collection("orders")
      .where("uid", "==", uid)
      .get();

    var userFound = false;
    var user;

    users.forEach((doc) => {
      userRef = doc.data();
      if (userRef.uid == uid) {
        user = userRef;
        userFound = true;
      } else {
        console.warn("Incorrect user");
      }
    });

    if (!userFound) {
      console.warn("User not found");
      return response.status(500).send("Could not find user.");
    }

    if (user.token != token) {
        response.status(200);
        respMsg = 'You do not have permission to complete this action.'
    } else {
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
              name: user.shippingAddress.firstName
            }
          };
      
          await sgMail.send(msg);
    }

    response.send(respMsg);
}

module.exports = shippingWebhook;