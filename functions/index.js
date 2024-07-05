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

const initializeFirestore = async () => {
  // 기본 mock 데이터 설정
  const mockData = {
    user: {
      tester1: { 
        fcm_token: 'eWd4mJo2vU-nib6tPzyDOe:APA91bHyqZquD_pkU0olBsG-ayk8BTiEzrh9ifCuZDayO4VWkMzqoj0qAJkwb9RmIAA9WEh04EobwYQGPh78FKhlBzS2ojnmM_cLt-lqEtSlCSvPwbzBO5RcmpLiYkV6XvTYGi4WacCO',
        login_time: Date.now() - 1000
      },
      tester2: { 
        name: 'Bob' 
      },
    },
    keyword: {
      k1: { 
        user_id: 'tester1',
        keyword: '애플', 
        enable: true 
      },
      k2: { 
        user_id: 'tester1', 
        keyword: '삼성', 
        enable: false 
      },
    },
  };

  // Firestore에 mock 데이터 삽입
  for (const collection in mockData) {
    for (const doc in mockData[collection]) {
      await db.collection(collection).doc(doc).set(mockData[collection][doc]);
    }
  }

  console.log('Firestore initialized with mock data');
};

initializeFirestore();

exports.test = onRequest(async (request, response) => {
  try {
    const usersSnapshot = await db.collection('user').where('fcm_token', '!=', null).get();
    usersSnapshot.forEach(async userDoc => {
      const userId = userDoc.id;
      const userUserTime = userDoc.data().login_time;
      const deviceToken = userDoc.data().fcm_token;
      console.log('----------', userId);
      const keywordsSnapshots = await db.collection('keyword').where('user_id', '==', userId).get();
      
      keywordsSnapshots.forEach(keywordDoc => {
        const keyword = keywordDoc.data().keyword;
        console.log('-----------', keyword, '------------------');
        parsing(keyword).then(async informations => {
          // response.json(informations);
          if (informations['time'] > userUserTime) {
            // push
            
            let message = {
              notification: {
                title: `${keyword}에서 새로운 뉴스가 도착했습니다.💛`,
                body: informations['title'],
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
            console.log('---------------push--------------');
            console.log(informations);
          } else {
            console.log('---------------no push--------------');
            console.log(informations);
          }
          
        }).catch(err => {
          console.error(err);
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