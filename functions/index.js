const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
admin.initializeApp();

const sgMail = require('@sendgrid/mail');
const API_KEY = functions.config().sendgrid.key;
const TEMPLATE_ID = functions.config().sendgrid.template;
const notifyEmail = functions.config().sendgrid.notifyemail;
const notifyEmailTemplate = functions.config().sendgrid.notifyemailtemplate;

sgMail.setApiKey(API_KEY);

var coinbase = require("coinbase-commerce-node");
var Client = coinbase.Client;
var Charge = coinbase.resources.Charge;
var Webhook = coinbase.Webhook;

Client.init(functions.config().coinbase.key);

const Stripe = require('stripe');
const stripe = new Stripe(functions.config().stripe.key);
const webhookSecret = functions.config().stripe.websec;

if (process.env.NODE_ENV === 'development') {
  firebase.functions().useFunctionsEmulator('http://localhost:8080');
}

exports.createCharge = functions.https.onCall(async (data, context) => {
  var form = data.form;

  var user = await admin.firestore().doc(`users/${context.auth.uid}`).get();
  if (!user.exists) {
    functions.https.HttpsError(
      "failed-precondition",
      "The function must be called by an authorized use"
    );
  }
  user = user.data();

  var chargeData = {
    name: `${form.firstName} ${form.lastName}`,
    description: "Bitprint Bitcard Order",
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
      paymentStatus: 'created'
    });

  return { uri: response.hosted_url };
});

exports.coinbaseWebhook = functions.https.onRequest(async (request, response) => {
	var event;

  console.log(request.body.event.data.id);
  var id = request.body.event.data.id;
  var code = request.body.event.data.code;
  var type = request.body.event.type.split(':')[1];

	try {
		event = Webhook.verifyEventBody(
			request.rawBody,
			request.headers['x-cc-webhook-signature'],
			functions.config().coinbase.webhook
		);
	} catch (error) {
		console.warn('Error occured', error.message);

		return response.status(400).send('Webhook Error:' + error.message);
  }
  
  var users = await admin.firestore().collection("users").where("paymentEndpoint.id", "==", id).get();

  var userFound = false;
  var user;
  users.forEach((doc) => {
    ref = doc.data();
    if (ref.paymentEndpoint.id == 'id') {
      user = ref;
      userFound = true;
    } else {
      console.log("Incorrect user");
    }
  });

  if (!userFound) {
    console.warn('User not found');
    return response.status(500).send('Could not find user' + event.id);
  } 

  if (type == 'confirmed') {

    admin
    .firestore()
    .doc(`orders/${user.paymentEndpoint.code}`)
    .set({
      order: user.cart,
      uid: user.uid,
      timestamp: getDate(),
      shippingAddress: user.shippingAddress,
      total: user.totalCost,
      code: user.paymentEndpoint.code
    });

    admin
    .firestore()
    .doc(`users/${user.uid}`)
    .update({
      order: user.cart,
      cart: [],
      totalCost: 0,
      paymentStatus: type
    });

    const msg = {
      to: user.shippingAddress.email,
      from: {
        email: 'orders@bitprint.io',
        name: 'Bitprint Orders'
      },
      reply_to: {
        email: 'support@bitprint.io',
        name: 'Bitprint Support'
      },
      templateId: TEMPLATE_ID,
      dynamic_template_data: {
        name: user.shippingAddress.firstName,
        receipt: `https://commerce.coinbase.com/receipts/${user.paymentEndpoint.code}`,
        code: user.paymentEndpoint.code
      }
    }
  
    await sgMail.send(msg);

  } else {
    admin
    .firestore()
    .doc(`users/${user.uid}`)
    .update({
      paymentStatus: type
    });
  }

  //send an email or something here

	console.log('Success', event.id);

	response.status(200).send('Signed Webhook Received: ' + event.id);
});

exports.stripeCreateCheckout = functions.https.onCall(async (data, context) => {
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
    payment_method_types: ['card'],
    line_items: [{
      price: 'price_HKlQAwsk8vOcbF',
      quantity: user.cart.length,
    }],
    client_reference_id: context.auth.uid,
    customer_email: form.email,
    mode: 'payment',
    success_url: 'http://bitprint.io/success',
    cancel_url: 'http://bitprint.io/checkout'
  });

  admin
  .firestore()
  .doc(`users/${context.auth.uid}`)
  .update({
    shippingAddress: form,
    paymentEndpoint: {
      id: session.payment_intent
    },
    paymentStatus: 'created'
  });

  return { sessionId: session.id };
});



exports.stripeWebhook = functions.https.onRequest(async (request, response) => {

  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.rawBody, sig, webhookSecret);
  } catch (error) {
    response.status(400).end();
    return;
  }

  if (event.type == 'checkout.session.completed') {

    const user = (await admin.firestore().doc(`users/${event.data.object.client_reference_id}`).get()).data();

    admin
    .firestore()
    .doc(`orders/${event.data.object.payment_intent}`)
    .set({
      order: user.cart,
      uid: user.uid,
      timestamp: getDate(),
      shippingAddress: user.shippingAddress,
      total: user.totalCost,
      code: event.data.object.payment_intent,
      customer: event.data.object.customer
    });

    admin
    .firestore()
    .doc(`users/${user.uid}`)
    .update({
      order: user.cart,
      cart: [],
      totalCost: 0,
      paymentStatus: 'completed',
      customerId: event.data.object.customer
    });

  } else 
  if(event.type == 'payment_intent.succeeded') {

    const id = event.data.object.charges.data[0].payment_intent;

    var users = await admin.firestore().collection("users").where("paymentEndpoint.id", "==", id).get();
  
    var userFound = false;
    var user;
    users.forEach((doc) => {
      ref = doc.data();
      if (ref.paymentEndpoint.id == 'id') {
        user = ref;
        userFound = true;
      } else {
        console.log("Incorrect user");
      }
    });
  
    if (!userFound) {
      console.warn('User not found');
      return response.status(500).send('Could not find user' + event.id);
    } 
  

    const msg = {
      to: user.shippingAddress.email,
      from: {
        email: 'orders@bitprint.io',
        name: 'Bitprint Orders'
      },
      reply_to: {
        email: 'support@bitprint.io',
        name: 'Bitprint Support'
      },
      templateId: TEMPLATE_ID,
      dynamic_template_data: {
        name: user.shippingAddress.firstName,
        receipt: event.data.object.charges.data[0].receipt_url,
        code: id
      }
    }
  
    await sgMail.send(msg);

    admin
    .firestore()
    .doc(`users/${user.uid}`)
    .update({
      paymentEndpoint: {
        receiptUri: event.data.object.charges.data[0].receipt_url
      }
    });

  } 

  response.json({received: true});
});

const runtimeOpts = {
  timeoutSeconds: 300
}

exports.buildOrders = functions
    .runWith(runtimeOpts)
    .firestore
    .document('orders/{orderId}')
    .onCreate(async (snap, context) => {

      const orderId = context.params.orderId;
      var order = snap.data();
      var fetchPromises = [];
      var counter = 0;
      var results = [];      

      for (let i = 0; i < order.order.length; i++) {
    
        if (counter == 3) {
          results.push(await Promise.all(fetchPromises));
          fetchPromises = [];
          counter = 0;
        } 

        const item = order.order[i];
        const params = new URLSearchParams();
        params.append('code', item.code);
        params.append('filename', item.id);
        fetchPromises.push(fetch('https://api.bitprint.io/api/stl', { method: 'POST', body: params }));
        counter++;
        console.log('Making request');
      }

      if (fetchPromises.length > 0) {
        results.push(await Promise.all(fetchPromises));
      }

      var stlUrls = [];
      for (let i = 0; i < results.length; i++) {
        for (let j = 0; j < results[i].length; j++) {
          const data = await results[i][j].json();
          stlUrls.push({url: data.url, id: data.id});
        }
      }

      for (let i = 0; i < order.order.length; i++) {
        const item = order.order[i];
        stlUrls.forEach(stl => {
          if (stl.id = item.id) {
            order.order[i].stl = stl.url;
          }
        });
      }
      
      await admin
      .firestore()
      .doc(`orders/${orderId}`)
      .update({
        order: order.order
      });

      const msg = {
        to: notifyEmail,
        from: {
          email: 'orders@bitprint.io',
          name: 'Bitprint Orders'
        },
        reply_to: {
          email: 'support@bitprint.io',
          name: 'Bitprint Support'
        },
        templateId: notifyEmailTemplate,
        dynamic_template_data: {
          items: stlUrls,
        }
      }
    
      await sgMail.send(msg);
      
    });

function getDate() {
  let date_ob = new Date();

  // current date
  // adjust 0 before single digit date
  let date = ("0" + date_ob.getDate()).slice(-2);

  // current month
  let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

  // current year
  let year = date_ob.getFullYear();

  // current hours
  let hours = date_ob.getHours();

  // current minutes
  let minutes = date_ob.getMinutes();

  // current seconds`
  let seconds = date_ob.getSeconds();

  return year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
}