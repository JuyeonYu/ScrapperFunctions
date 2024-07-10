/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */


const functions = require('firebase-functions');
const express = require('express');
const app = express();
const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const hasNews = require("./fetchNewsService");
const unreadNewsTitle = require("./fetchNewsService");
admin.initializeApp();
const db = admin.firestore();

exports.api = functions.https.onRequest(app);

exports.pushEveryHour = onSchedule(
  "*/10 * * * *", async (event) => {
  console.log(`pushEveryHour! ${event.scheduleTime}`);
  console.log(event.scheduleTime);
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - (60 * 10 * 1000));
  const timestampOneHourAgo = oneHourAgo.getTime();

  try {
    const usersSnapshot = await db.collection('user').where('fcm_token', '!=', null).get();

    for (let userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const deviceToken = userDoc.data().fcm_token;
      const keywordsSnapshots = await db.collection('keyword').where('user_id', '==', userId).get();
      let hasNewKeywords = [];
      let unreadNewsTitles = [];

      for (let keywordDoc of keywordsSnapshots.docs) {
        const keyword = keywordDoc.data().keyword;

        try {
          const title = await unreadNewsTitle(keyword, timestampOneHourAgo);
          if (title != null) {
            console.log(`새로운 뉴스가 발견되었습니다. 키워드: ${keyword}`);
            hasNewKeywords.push(keyword);
            unreadNewsTitles.push(title)
          }
        } catch (err) {
          console.error(`키워드 검색 중 오류 발생: ${err}`);
        }
      }

      if (unreadNewsTitles.length > 0) {
        const body = unreadNewsTitles.length == 1 ? unreadNewsTitles[0] : `${unreadNewsTitles[0]} 외 ${unreadNewsTitles.length - 1}건`
        const message = {
          notification: {
            title: keyword,
            body: body,
          },
          token: deviceToken,
          data: {
            keywords: JSON.stringify(hasNewKeywords)
          }
        };

        try {
          const response = await admin.messaging().send(message);
          console.log('푸시 알림 전송 성공:', response);
        } catch (err) {
          console.error('푸시 알림 전송 실패:', err);
        }

        hasNewKeywords = [];
      }
    }

    console.log('푸시 알림 전송 완료');
    return null;
  } catch (error) {
    console.error('사용자 불러오기 실패:', error);
    throw new functions.https.HttpsError('internal', '에러 발생', error);
  }
});

// App Check 미들웨어
const appCheckMiddleware = async (req, res, next) => {
  const appCheckToken = req.header('X-Firebase-AppCheck');

  if (!appCheckToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const appCheckClaims = await admin.appCheck().verifyToken(appCheckToken);
    req.appCheckClaims = appCheckClaims;
    next();
  } catch (error) {
    return res.status(401).json({ error: `Unauthorized: ${error.message}` });
  }
};

app.use(appCheckMiddleware);

app.post('/fetchNewKeywords', async (req, res) => {
  const fetchSince = req.body.time;
  const keywords = req.body.keywords.split(',');

  if (!fetchSince || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  let hasNewsDict = {};

  try {
    await Promise.all(keywords.map(async (keyword) => {
      try {
        hasNewsDict[keyword] = await hasNews(keyword, fetchSince);
      } catch (error) {
        hasNewsDict[keyword] = { error: error.message };
      }
    }));

    res.json(hasNewsDict);
  } catch (error) {
    res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
});