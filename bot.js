require('dotenv').config();

const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');

const client = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = client.readWrite;
const keyword = 'follow back';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBot() {
  try {
    console.log(`🔍 Fetching latest tweets with "${keyword}"...`);
    const result = await rwClient.v2.search(keyword, {
      max_results: 10,
      sort_order: 'recency',
      'tweet.fields': 'author_id',
    });


    console.log("📦 Raw search result:", JSON.stringify(result, null, 2));

    const tweets = result?.data || [];

    if (!tweets || tweets.length === 0) {
      console.log('❌ No tweets found.');
      return;
    }


    const myUserId = process.env.TWITTER_ACCESS_TOKEN.split('-')[0];

    for (let i = 0; i < Math.min(10, tweets.length); i++) {
      const tweet = tweets[i];
      const tweetId = tweet.id;
      const authorId = tweet.author_id;

      try {
        console.log(`💬 Interacting with tweet ${tweetId} by user ${authorId}`);

        // Like the tweet
        await rwClient.v2.like(myUserId, tweetId);
        console.log(`👍 Liked tweet ${tweetId}`);

        // Comment on the tweet
        await rwClient.v2.reply('fb 🔁', tweetId);
        console.log(`💬 Commented "fb" on ${tweetId}`);

        // Follow the user
        await rwClient.v2.follow(myUserId, authorId);
        console.log(`➕ Followed user ${authorId}`);

      } catch (err) {
        console.error(`⚠️ Failed to interact with tweet ${tweetId}: ${err.message}`);
      }

      // Wait 1 second before next action
      await delay(1000);
    }
  } catch (err) {
    console.error('❌ Error during search or interaction:', err.message);
  }
}


// 🔁 Schedule to run every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('⏱ Running bot at', new Date().toLocaleTimeString());
  runBot();
});

// Run immediately when script starts
console.log('🚀 Bot starting immediately...');
runBot();
