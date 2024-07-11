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
const getUnreadNews = require("./fetchNewsService");
admin.initializeApp();
const db = admin.firestore();
app.use(express.json());

const batchPeriodMinute = 10
exports.api = functions.https.onRequest(app);

exports.pushEveryHour = onSchedule(
  `*/${batchPeriodMinute} * * * *`, async (event) => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - (60 * batchPeriodMinute * 1000));
  const timestampOneHourAgo = oneHourAgo.getTime();

  try {
    const usersSnapshot = await db.collection('user').where('fcm_token', '!=', null).get();

    for (let userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const deviceToken = userDoc.data().fcm_token;
      const keywordsSnapshots = await db.collection('keyword').where('user_id', '==', userId).get();
      let unreadNewsList = [];

      for (let keywordDoc of keywordsSnapshots.docs) {
        const keyword = keywordDoc.data().keyword;

        try {
          const news = await getUnreadNews(keyword, timestampOneHourAgo);
          if (news != null) {
            unreadNewsList.push(news);
          }
        } catch (err) {
          console.error(`키워드 검색 중 오류 발생: ${err}`);
        }
      }

      if (unreadNewsList.length > 0) {
        const unreadNewsListLength = unreadNewsList.length;
        const title = unreadNewsListLength == 1 ? unreadNewsList['keyword'] : `${unreadNewsList['keyword']} 외 ${unreadNewsListLength - 1}개 키워드`
        const body = y ? unreadNewsList['title'] : `${unreadNewsList[0]} 외 ${unreadNewsListLength - 1}건`
        const message = {
          notification: {
            title: title,
            body: body,
          },
          token: deviceToken,
          data: {
            keywords: JSON.stringify(unreadNewsListLength == 1 ? unreadNewsList['link'] : null)
          }
        };

        try {
          const response = await admin.messaging().send(message);
          console.log('푸시 알림 전송 성공:', response);
        } catch (err) {
          console.error('푸시 알림 전송 실패:', err);
        }
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

// app.use(appCheckMiddleware);

app.post('/unreadNews', async (req, res) => {
  const fetchSince = Number(req.body.time);
  const keywords = req.body.keywords.split(',');

  if (!fetchSince || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  let unreadNewsList = [];

  try {
    await Promise.all(keywords.map(async (keyword) => {
      try {
        const news = await getUnreadNews(keyword, fetchSince);
        if (news != null) {
          unreadNewsList.push(keyword);
        }
      } catch (error) {
        res.status(100).json({ error: `Parse Error: ${error.message}` });
      }
    }));
    res.json(unreadNewsList);
  } catch (error) {
    res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
});

exports.unreadNewsKeywords = functions.https.onRequest(async (req, res) => {
  const data = req.body.data;
  const newsList = data.news;
  const fetchSince = data.timestamp;

  const hasNewsKeywords = [];
  const keywords = newsList.map(function(element) {
    return `${element.keyword}`;
});

  try {
    await Promise.all(keywords.map(async (keyword) => {
      try {
        const news = await getUnreadNews(keyword, fetchSince);
        if (news != null) {
          hasNewsKeywords.push(keyword);
        }
      } catch (error) {
        res.status(100).json({ error: `Parse Error: ${error.message}` });
      }
    }));
    res.json({data: hasNewsKeywords});
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
});
