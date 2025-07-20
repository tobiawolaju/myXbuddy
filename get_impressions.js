require('dotenv').config();
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const { TwitterApi } = require('twitter-api-v2');
const { GoogleGenAI } = require('@google/genai');

const client = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});
const rwClient = client.readWrite;

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function loadRepliedTweetsFromGoogle() {
  try {
    const res = await axios.get(GOOGLE_SCRIPT_URL);
    return res.data || [];
  } catch (err) {
    console.error('❌ Error fetching from Google Sheet:', err.message);
    return [];
  }
}

async function saveRepliedTweetToGoogle(tweetId, text, mediaUrls = []) {
  try {
    await axios.post(GOOGLE_SCRIPT_URL, {
      tweetId,
      text,
      media: mediaUrls.join(', '),
    });
    console.log(`📌 Saved tweet ${tweetId} to Google Sheet`);
  } catch (err) {
    console.error('❌ Failed to save to Google Sheet:', err.message);
  }
}

async function fetchTweets(handle, limit = 5) {
  const url = `https://x.com/${handle.replace('@', '')}`;
  let browser;

  try {
   browser = await puppeteer.launch({
  executablePath: puppeteer.executablePath(), // <- use downloaded Chrome
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
    );
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const tweetSelector = 'article[data-testid="tweet"]';
    await page.waitForSelector(tweetSelector, { timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);

    const tweets = [];
    $(tweetSelector).slice(0, limit).each((_, elem) => {
      const tweet = $(elem);
      const text = tweet.find('div[data-testid="tweetText"]').text().trim();
      const permalinkElement = tweet.find('a[href*="/status/"]:has(time)');
      const tweetId = permalinkElement.attr('href')?.split('/').pop() || null;

      const media = [];
      tweet.find('img[src*="pbs.twimg.com/media/"]').each((_, img) => {
        const imgSrc = $(img).attr('src');
        if (imgSrc) media.push(imgSrc.replace(/&name=\w+$/, '&name=orig'));
      });

      const video = tweet.find('video');
      if (video.length) {
        const posterUrl = video.attr('poster');
        if (posterUrl) media.push(posterUrl);
      }

      if (tweetId) tweets.push({ tweetId, text, media });
    });

    return tweets;
  } catch (err) {
    console.error(`❌ Failed to fetch tweets from ${handle}:`, err.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

async function generateReply(text, mediaUrls) {
  const prompt = `
media: ${mediaUrls.length ? mediaUrls[0] : 'N/A'}
text: ${text}
Instruction: Reply to this tweet as a regular person. The reply should be short, natural, and engaging. Only return one sentence. No hashtags. This will be used in an automated reply system.`;

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const model = 'gemini-2.5-pro';

    const result = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 60,
      },
    });

    const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return reply || 'Interesting!';
  } catch (err) {
    console.error('❌ Gemini failed:', err.message);
    return 'That’s something!';
  }
}

async function replyToTweet(tweetId, replyText) {
  try {
    const res = await rwClient.v2.tweet({
      text: replyText,
      reply: { in_reply_to_tweet_id: tweetId },
    });
    console.log(`✅ Replied to ${tweetId} with tweet ID: ${res.data.id}`);
  } catch (err) {
    console.error('❌ Failed to reply:', err?.data || err.message || err);
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const handles = [
  '@weirddalle',
  '@yabaleftonline',
  '@interesting_aIl',
  '@elonmusk',
  '@PopBase',
  '@NFL',
  '@crazyclips_',
];

(async () => {
  while (true) {
    for (const handle of handles) {
      console.log(`\n🚀 Processing handle: ${handle}`);
      const tweets = await fetchTweets(handle, 5);
      const replied = await loadRepliedTweetsFromGoogle();

      let newReplyMade = false;

      for (const tweet of tweets) {
        if (replied.includes(tweet.tweetId)) {
          console.log(`🔁 Already replied to ${tweet.tweetId}`);
          continue;
        }

        console.log(`🆕 New tweet: ${tweet.text}`);
        const replyText = await generateReply(tweet.text, tweet.media);
        console.log(`🤖 Gemini says: ${replyText}`);

        await replyToTweet(tweet.tweetId, replyText);
        await saveRepliedTweetToGoogle(tweet.tweetId, tweet.text, tweet.media);
        newReplyMade = true;
        break; // only reply to one per handle
      }

      console.log(`⏱ Waiting 4 minutes before next handle...\n`);
      await wait(4 * 60 * 1000);
    }

    console.log(`🔁 Completed all handles. Restarting loop in 5 seconds...\n`);
    await wait(5000);
  }
})();
