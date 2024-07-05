/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */



const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require('firebase-functions');
const express = require('express');
const app = express();
const admin = require('firebase-admin');
const parsing = require('./fetchNewsService');
const push = require('./pushNotiService');
const db = admin.firestore();

exports.api = functions.https.onRequest(app);

exports.test = onRequest(async (request, response) => {
  try {
    const usersSnapshot = await db.collection('user').where('fcm_token', '!=', null).get();
    usersSnapshot.forEach(async userDoc => {
      const userId = userDoc.id;
      console.log('----------', userId);
      const keywordsSnapshots = await db.collection('keyword').where('user_id', '==', userId).get();
      
      keywordsSnapshots.forEach(keywordDoc => {
        const keyword = keywordDoc.data().keyword;
        console.log('-----------', keyword, '------------------');
        parsing(keyword).then(informations => {
          // response.json(informations);
          console.log(informations);
        }).catch(err => {
          console.error(err);
          // response.send(err);
        });
      });
    });



    response.status(200).json('keywords');
  } catch (error) {
    response.status(500).send(`Error getting users: ${error}`);
  }
});

exports.fetchNews = onRequest((request, response) => {
  const keyword = request.params[0];
  if (!keyword) {
    return response.status(400).send({error: 'Keyword is required'});
  }
  push('eWd4mJo2vU-nib6tPzyDOe:APA91bHyqZquD_pkU0olBsG-ayk8BTiEzrh9ifCuZDayO4VWkMzqoj0qAJkwb9RmIAA9WEh04EobwYQGPh78FKhlBzS2ojnmM_cLt-lqEtSlCSvPwbzBO5RcmpLiYkV6XvTYGi4WacCO');
  parsing(keyword).then(informations => {
    response.json(informations);
  }).catch(err => {
    console.error(err);
    response.send(err);
  });
});

exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});