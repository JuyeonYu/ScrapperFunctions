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

  let informations = [];
  $titlist.each((idx, node) => {
    const timestamp = relativeTimeToTimestamp($(node).find(".info_group > span").text());
    informations.push({
      title: $(node).find(".news_tit:eq(0)").text(), // 뉴스제목 크롤링
      // press: $(node).find(".info_group > a").text(), // 출판사 크롤링
      time: timestamp, // 기사 작성 시간 크롤링
      pubData: $(node).find(".info_group > span").text()
      // contents: $(node).find(".dsc_wrap").text(), // 기사 내용 크롤링
    });
  });

  return informations; // 정보를 반환합니다.
}

const hasNews = async (keyword, sinceTimestamp) => {
  const html = await getHTML(keyword);
  const $ = cheerio.load(html.data);
  const $titlist = $(".news_area");

  for (let idx = 0; idx < $titlist.length; idx++) {
    const $node = $titlist.eq(idx);
    const timestamp = relativeTimeToTimestamp($node.find(".info_group > span").text());
    if (timestamp > sinceTimestamp) {
      console.log($node.find(".news_tit:eq(0)").text(), $node.find(".info_group > span").text(), timestamp, sinceTimestamp);
      return true;
    }
  }
  return false;
}

const unreadNewsTitle = async (keyword, sinceTimestamp) => {
  const html = await getHTML(keyword);
  const $ = cheerio.load(html.data);
  const $titlist = $(".news_area");

  for (let idx = 0; idx < $titlist.length; idx++) {
    const $node = $titlist.eq(idx);
    const timestamp = relativeTimeToTimestamp($node.find(".info_group > span").text());
    if (timestamp > sinceTimestamp) {
      return $node.find(".news_tit:eq(0)").text();
    }
  }
  return null;
}

module.exports = parsing;
module.exports = hasNews;
module.exports = unreadNewsTitle;