const { db } = require("../admin");
const functions = require("firebase-functions");

const fetch = require("node-fetch");
const { URLSearchParams } = require("url");

const sgMail = require("@sendgrid/mail");
const API_KEY = functions.config().sendgrid.key;
const notifyEmail = functions.config().sendgrid.notifyemail;
const notifyEmailTemplate = functions.config().sendgrid.notifyemailtemplate;
sgMail.setApiKey(API_KEY);

const PDFDocument = require("pdfkit");

const { Storage } = require("@google-cloud/storage");
const projectId = "bitprint-store";
const bucketName = `${projectId}.appspot.com`;
const storage = new Storage({ projectId });
const bucket = storage.bucket(bucketName);

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

  //Generate Insert
  const pdf = await buildPDF(order.shippingAddress, orderId);  

  var token = genId();

  await db.doc(`orders/${orderId}`).update({
    order: order.order,
    insert: pdf,
    token: token
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
      pdfInsert: pdf,
      shippingURL: genShippingURL(token, order.uid)
    },
  };

  await sgMail.send(msg);
};

function buildPDF(address, id) {
  return new Promise((resolve, reject) => {
    var doc = new PDFDocument();

    const blob = bucket.file(`inserts/${id}.pdf`);
    const blobStream = blob.createWriteStream({
      public: true,
    });
    doc.pipe(blobStream);

    doc
      .fontSize(25)
      .font("Courier")
      .text("Thank you for your purchase!", 50, 50);
    doc
      .fontSize(15)
      .font("Courier")
      .text("You will find your card enclosed below.", 50, 75);
    doc.fontSize(8).font("Courier").text("Best Regards,", 50, 95);
    doc.fontSize(8).font("Courier").text("Your Friends at Bitprint", 50, 105);

    var windowHeight = 175;

    doc
      .fontSize(15)
      .font("Courier")
      .text(`${address.firstName} ${address.lastName}`, 80, windowHeight);
    doc
      .fontSize(15)
      .font("Courier")
      .text(address.address, 80, windowHeight + 15);
    if (address.address2 != "") {
      doc
        .fontSize(15)
        .font("Courier")
        .text(address.address2, 80, windowHeight + 30);
      doc
        .fontSize(15)
        .font("Courier")
        .text(
          `${address.city}, ${address.state} ${address.zip}`,
          80,
          windowHeight + 45
        );
    } else {
      doc
        .fontSize(15)
        .font("Courier")
        .text(
          `${address.city}, ${address.state} ${address.zip}`,
          80,
          windowHeight + 30
        );
    }

    doc.lineCap("butt").moveTo(50, 280).lineTo(100, 280).stroke();

    doc.polygon([550, 355], [310, 355], [310, 510], [550, 510]);
    doc.stroke();

    doc.image("./assets/logo.png", 80, 355, { scale: 0.12 });

    doc
      .fontSize(8)
      .font("Courier")
      .text(
        "If there was an issue with your order, contact us at support@bitprint.io",
        50,
        700
      );

    doc.end();

    blobStream.on("error", (err) => {
      reject(err);
    });

    blobStream.on("finish", () => {
      const publicUrl = createPublicFileURL(`inserts/${id}.pdf`);
      resolve(publicUrl);
    });
  });
}

function createPublicFileURL(storageName) {
  return `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(
    storageName
  )}`;
}

function genShippingURL(token, uid) {
  return `https://us-central1-bitprint-store.cloudfunctions.net/shippingWebhook?uid=${uid}&token=${token}`
}

function genId() {
  const isString = `${this.S4()}${this.S4()}-${this.S4()}-${this.S4()}-${this.S4()}-${this.S4()}${this.S4()}${this.S4()}`;
  return isString;
}

function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

module.exports = buildOrders;
