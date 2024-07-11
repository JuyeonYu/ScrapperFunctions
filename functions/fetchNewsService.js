const axios = require("axios");
const cheerio = require("cheerio");

// HTML 코드를 가지고 오는  함수
const getHTML = async(keyword) => {
  try{
    return await axios.get("https://search.naver.com/search.naver?where=news&ie=UTF-8&query=" + encodeURI(keyword)) //""안에는 URL 삽입
  }catch(err) {
    console.log(err);
  }
}

function relativeTimeToTimestamp(relativeTime) {
  const currentDate = new Date();
  
  if (relativeTime.includes('분 전')) {
      const minutesAgo = parseInt(relativeTime);
      currentDate.setMinutes(currentDate.getMinutes() - minutesAgo);
  } else if (relativeTime.includes('시간 전')) {
      const hoursAgo = parseInt(relativeTime);
      currentDate.setHours(currentDate.getHours() - hoursAgo);
  } else if (relativeTime.includes('일 전')) {
      const daysAgo = parseInt(relativeTime);
      currentDate.setDate(currentDate.getDate() - daysAgo);
  } else if (relativeTime.includes('주 전')) {
      const weeksAgo = parseInt(relativeTime);
      currentDate.setDate(currentDate.getDate() - (weeksAgo * 7));
  } else {
    return 0;
  }

  return currentDate.getTime(); // Timestamp in milliseconds
}

 // 파싱 함수
const parsing = async (keyword) => {
  const html = await getHTML(keyword);
  const $ = cheerio.load(html.data); // 가지고 오는 data load
  const $titlist = $(".news_area");

  let newsList = [];
  $titlist.each((idx, node) => {
    const timestamp = relativeTimeToTimestamp($(node).find(".info_group > span").text());
    newsList.push({
      title: $(node).find(".news_tit:eq(0)").text(), // 제목
      link: $(node).find(".news_tit:eq(0)").attr('href'), // 링크
      press: $(node).find(".info_group > a").text(), // 출판사
      timestamp: timestamp, // 작성 시간 타임스탬사
      pubData: $(node).find(".info_group > span").text(), // 작성 시간 '1분 전' 포멧
      contents: $(node).find(".dsc_wrap").text(), // 내용
    });
  });

  return newsList;
}

const getUnreadNews = async (keyword, sinceTimestamp) => {
  const newsList = await parsing(keyword);
  for (news of newsList) {
    if (news['timestamp'] > sinceTimestamp) {
      return {'keyword': keyword, 'title': news['title'], 'link': news['link']};
    }
  }
}

module.exports = getUnreadNews;