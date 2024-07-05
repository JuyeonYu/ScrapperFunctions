const admin = require('firebase-admin');
const serviceAccount = require("../firebase-admin-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // databaseURL: "https://news-scrap-b64dd-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const pushAlarm = async (deviceToken) => {
    let message = {
      notification: {
        title: '테스트 발송💛',
        body: 'hello💚',
      },
      token: deviceToken,
    };
  
    try {
      const response = await admin.messaging().send(message);
      console.log('Successfully sent message: ', response);
      // write something on database
    } catch (err) {
      console.log('Error sending message: ', err);
      // write something on database
    }
  };
  
  module.exports = pushAlarm;