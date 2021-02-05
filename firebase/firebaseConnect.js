const firebase = require("firebase");
const admin = require("firebase-admin");
const config = require("./config");

const firebaseConnect = async () => {
  // Initialize Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(config);

    var serviceAccount = require("./whats-next-api-firebase-adminsdk-swhij-f1b709ac22.json");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase initialised".cyan.bold);
  }
};

module.exports = firebaseConnect;
