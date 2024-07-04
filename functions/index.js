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
const parsing = require('./fetchNews');

exports.api = functions.https.onRequest(app);

exports.fetchNews = onRequest((request, response) => {
  const keyword = request.params[0];
  if (!keyword) {
    return response.status(400).send({error: 'Keyword is required'});
  }
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