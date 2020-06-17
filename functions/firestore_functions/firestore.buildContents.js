const { db } = require("../admin");
const functions = require('firebase-functions');

const fetch = require("node-fetch");
const { URLSearchParams } = require("url");

const sgMail = require("@sendgrid/mail");
const API_KEY = functions.config().sendgrid.key;
const notifyEmail = functions.config().sendgrid.notifyemail;
const notifyEmailTemplate = functions.config().sendgrid.notifyemailtemplate;
sgMail.setApiKey(API_KEY);

const buildOrders = async (snap, context) => {
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
    params.append("code", item.code);
    params.append("filename", item.id);
    fetchPromises.push(
      fetch("https://api.bitprint.io/api/stl", {
        method: "POST",
        body: params,
      })
    );
    counter++;
    console.log("Making request");
  }

  if (fetchPromises.length > 0) {
    results.push(await Promise.all(fetchPromises));
  }

  var stlUrls = [];
  for (let i = 0; i < results.length; i++) {
    for (let j = 0; j < results[i].length; j++) {
      const data = await results[i][j].json();
      stlUrls.push({ url: data.url, id: data.id });
    }
  }

  for (let i = 0; i < order.order.length; i++) {
    const item = order.order[i];
    stlUrls.forEach((stl) => {
      if ((stl.id = item.id)) {
        order.order[i].stl = stl.url;
      }
    });
  }

  await admin.firestore().doc(`orders/${orderId}`).update({
    order: order.order,
  });

  const msg = {
    to: notifyEmail,
    from: {
      email: "orders@bitprint.io",
      name: "Bitprint Orders",
    },
    reply_to: {
      email: "support@bitprint.io",
      name: "Bitprint Support",
    },
    templateId: notifyEmailTemplate,
    dynamic_template_data: {
      order: order.order,
    },
  };

  await sgMail.send(msg);
};

module.exports = buildOrders;

// // create a document and pipe to a blob
// var doc = new PDFDocument();
// var stream = doc.pipe(blobStream());

// doc.fontSize(25).font('Courier').text('Thank you for your purchace!', 50, 50);
// doc.fontSize(15).font('Courier').text('You will find your cord enclosed below.', 50, 75);

// doc.fontSize(15).font('Courier').text('John Oliver' , 96 , 210);
// doc.fontSize(15).font('Courier').text('10612 Fiesta Rd.' , 96 , 225);
// doc.fontSize(15).font('Courier').text('Fairfax, VA 20032 USA', 96 , 240);

// doc.polygon([700, 275], [0, 275], [0, 550], [700, 550]);
// doc.fill('#ededed');

// doc.polygon([550 ,350], [330, 350], [330, 475], [550 , 475]);
// doc.stroke();

// doc.fontSize(15).font('Courier').text('John Oliver', 80, 610 );
// doc.s

// // end and display the document in the iframe to the right
// doc.end();
// stream.on('finish', function() {
//   iframe.src = stream.toBlobURL('application/pdf');
// });
