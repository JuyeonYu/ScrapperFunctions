/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require('firebase-functions/v2');
const { HttpsError } = require('firebase-functions/v2/https');
const express = require('express');
const app = express();
const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getUnreadNews, parsing } = require('./fetchNewsService');


const { onCall } = require('firebase-functions/v2/https');

admin.initializeApp();
const db = admin.firestore();
app.use(express.json());

const batchPeriodMinute = 30
// exports.api = functions.https.onRequest(app);

// const initializeFirestore = async () => {
//   // 기본 mock 데이터 설정
//   const mockData = {
//     user: {
//       tester1: { 
//         fcm_token: 'eWd4mJo2vU-nib6tPzyDOe:APA91bHyqZquD_pkU0olBsG-ayk8BTiEzrh9ifCuZDayO4VWkMzqoj0qAJkwb9RmIAA9WEh04EobwYQGPh78FKhlBzS2ojnmM_cLt-lqEtSlCSvPwbzBO5RcmpLiYkV6XvTYGi4WacCO',
//         login_time: 123
//       },
//       tester2: { 
//         name: 'Bob' 
//       },
//       tester3: { 
//         name: 'Bot' 
//       },
//     },
//     keyword: {
//       k1: { 
//         user_id: 'tester1',
//         keyword: '애플', 
//         enable: true 
//       },
//       // k2: { 
//       //   user_id: 'tester1', 
//       //   keyword: '삼성', 
//       //   enable: false 
//       // },
//     },
//   };

//   // Firestore에 mock 데이터 삽입
//   for (const collection in mockData) {
//     for (const doc in mockData[collection]) {
//       await db.collection(collection).doc(doc).set(mockData[collection][doc]);
//     }
//   }

//   console.log('Firestore initialized with mock data');
// };

// initializeFirestore();

exports.pushFCM = onSchedule(
  `*/${batchPeriodMinute} * * * *`, async (event) => {
    console.log(event.scheduleTime);
    console.log(`--------------pushFCM called------------------`);
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - (60 * batchPeriodMinute * 1000));
  const timestampOneHourAgo = oneHourAgo.getTime();

  try {
    const usersSnapshot = await db.collection('user').where('fcm_token', '!=', null).get();
    console.log(`--------------fetched usersSnapshot, loop user------------------`);

    for (let userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const deviceToken = userDoc.data().fcm_token;
      console.log(`-----------${userId} / ${deviceToken}---------------`);

      const keywordsSnapshots = await db.collection('keyword').where('user_id', '==', userId).get();

      let unreadNewsList = [];

      console.log(`--------------fetched keywordsSnapshots, loop keyword of ${keywordsSnapshots.docs.length}------------------`);

      for (let keywordDoc of keywordsSnapshots.docs) {
        console.log(`0-----------${keywordDoc.data()}---------------`);
        const keyword = keywordDoc.data().keyword;
        const exceptionKeyword = keywordDoc.data().exception_keyword ?? null;
        const notiEnable = keywordDoc.data().noti_enable ?? false;

        if (!notiEnable) {
          continue;
        }
        
        console.log(`1-----------${keyword} / ${exceptionKeyword}---------------`);
        try {
          const news = await getUnreadNews(keyword, exceptionKeyword, timestampOneHourAgo);
          console.log(`2-----------${keyword} / ${news.title}---------------`);
          if (news != null) {
            unreadNewsList.push(news);
          }
        } catch (err) {
          console.error(`키워드 검색 중 오류 발생: ${err}`);
        }
      }

      if (unreadNewsList.length > 0) {
        const unreadNewsListLength = unreadNewsList.length;
        const hasOneNews = unreadNewsListLength == 1;
        const title = hasOneNews ? unreadNewsList[0]['keyword'] : `${unreadNewsList[0]['keyword']} 외 ${unreadNewsListLength - 1}개 키워드`
        const body = hasOneNews ? unreadNewsList[0]['title'] : `${unreadNewsList[0]['title']} 외 ${unreadNewsListLength - 1}건`
        const message = {
          notification: {
            title: title,
            body: body,
          },
          token: deviceToken,
          data: {
            keywords: unreadNewsList.length == 1 ? unreadNewsList[0]['link'] : null
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

// exports.test = onCall(async (data) => {
//   const now = new Date();
//   const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
//   // console.log(`${oneHourAgo.getTime()} / ${new Date(now.getTime().getTime())}`);
//   const timestampOneHourAgo = oneHourAgo.getTime();

//   try {
//     console.log(1111111);
//     const usersSnapshot = await db.collection('user').where('fcm_token', '!=', null).get();
//     console.log(`--------------fetched usersSnapshot, loop user------------------`);

//     for (let userDoc of usersSnapshot.docs) {
//       const userId = userDoc.id;
//       const deviceToken = userDoc.data().fcm_token;
//       console.log(`user-----------${userId} / ${deviceToken}---------------`);

//       const keywordsSnapshots = await db.collection('keyword').where('user_id', '==', userId).get();

//       let unreadNewsList = [];

//       console.log(`--------------fetched keywordsSnapshots, loop keyword of ${keywordsSnapshots.docs.length}------------------`);

//       for (let keywordDoc of keywordsSnapshots.docs) {
//         console.log(`--------------keyword ${JSON.stringify(keywordDoc.data())}------------------`);
//         const keyword = keywordDoc.data().keyword;
//         const exceptionKeyword = keywordDoc.data().exception_keyword ?? null;
//         // const exceptionKeyword = '';
//         console.log(`-----------${keyword} / ${exceptionKeyword}---------------`);
//         try {
//           const news = await getUnreadNews(keyword, exceptionKeyword, timestampOneHourAgo);
//           console.log(`123-----------${keyword} / ${news}---------------`);
//           if (news != null) {
//             unreadNewsList.push(news);
//           }
//         } catch (err) {
//           console.error(`키워드 검색 중 오류 발생: ${err}`);
//         }
//       }

//       if (unreadNewsList.length > 0) {
//         const unreadNewsListLength = unreadNewsList.length;
//         const hasOneNews = unreadNewsListLength == 1;
//         const title = hasOneNews ? unreadNewsList[0]['keyword'] : `${unreadNewsList[0]['keyword']} 외 ${unreadNewsListLength - 1}개 키워드`
//         const body = hasOneNews ? unreadNewsList[0]['title'] : `${unreadNewsList[0]['title']} 외 ${unreadNewsListLength - 1}건`
//         const message = {
//           notification: {
//             title: title,
//             body: body,
//           },
//           token: deviceToken,
//           data: {
//             keywords: JSON.stringify(unreadNewsList)
//           }
//         };

//         try {
//           const response = await admin.messaging().send(message);
//           console.log('푸시 알림 전송 성공:', response);
//         } catch (err) {
//           console.error('푸시 알림 전송 실패:', err);
//         }
//       }
//     }

//     console.log('푸시 알림 전송 완료');
//     return null;
//   } catch (error) {
//     console.error('사용자 불러오기 실패:', error);
//     throw new functions.https.HttpsError('internal', '에러 발생', error);
//   }
// });

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

async function GetUnreadNewsOnCall(newsList) {
  console.log('GetUnreadNewsOnCall called');
  const hasNewsKeywords = [];

  try {
    await Promise.all(newsList.map(async (news) => {
      try {
        let keyword = news['keyword'];
        let fetchSince = news['last_read_t'];
        let exceptionKeyword = news['exception_keyword'];
        const unreadNews = await getUnreadNews(keyword, exceptionKeyword, fetchSince);
        console.log('-----------------unreadNews------------------');
        console.log(unreadNews);
        if (unreadNews != null) {
          hasNewsKeywords.push(keyword);
        }
      } catch (error) {
        console.log(`-----------------unreadNews1 error: ${error.message}------------------`);
      }
    }));
    console.log(`-----no error------`);
    return hasNewsKeywords;
  } catch (error) {
    console.log(`-----------------unreadNews2 error: ${error.message}------------------`);
    throw new HttpsError(
      'internal',
      `Internal Server Error: ${error.message}`
    );
  }
}

/* eslint-disable no-unused-vars */

exports.unreadNewsKeywords = onCall(async (data) => {
  try {
    const newsList = data.data.news; // 데이터에서 news 리스트를 가져옵니다.
    if (!Array.isArray(newsList)) {
      throw new HttpsError('invalid-argument', 'The news argument must be an array.');
    }

    console.log(newsList);

    if (!newsList) {
      console.log('no new');
      return [];
    }

    const unreadNews = await GetUnreadNewsOnCall(newsList);
    return unreadNews;
  } catch (error) {
    console.error('Failed to get unread news:', error);
    throw new HttpsError('internal', 'An internal error occurred.', error);
  }
});

exports.feed = onCall(async (data, context) => {
  try {
    if (data.auth.uid == null) {
      return null;
    } else if (data.data) {
      const keywords = JSON.parse(data.data);
      let newsDicts = [];
      try {
        await Promise.all(keywords.map(async (keyword) => {
          const news = await parsing(keyword);
          let dict = {'keyword': keyword, 'items': news};
          newsDicts.push(dict)
        }))
      } catch(error) {
        console.error(error);
      }
      console.log(`return: ${newsDicts}`);
      return JSON.stringify(newsDicts);
    }
    return null;
  } catch (error) {
    console.error('Failed to get unread news:', error);
    throw new HttpsError('internal', 'An internal error occurred.', error);
  }
});

/* eslint-enable no-unused-vars */