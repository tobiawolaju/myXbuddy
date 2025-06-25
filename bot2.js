require('dotenv').config();

const { TwitterApi } = require('twitter-api-v2');

// Create Twitter client using credentials from .env
const client = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = client.readWrite;

// Mock search result data
const mockResult = {
  "_maxResultsWhenFetchLast": 100,
  "_realData": {
    "data": [
      {
        "edit_history_tweet_ids": ["1937342290873450908"],
        "text": "@anjicasway @HSangngern Follow Back please 💜",
        "author_id": "1167968431364169728",
        "id": "1937342290873450908"
      },
      {
        "edit_history_tweet_ids": ["1937342281524346938"],
        "text": "@Baoo_321 @rita01059367 @emilyk_id @TlayAnl1903 @Galope2021 @VDieyo24431 @drikinhapower @AndraCastilho3 @AliceFollowsB @Baldo04555156 @Faithmokua4 @3_toshiyuki @FegensV @mvf7186 @DavidSolom82677 @BY_HERO_COCO 🎵🚨🫰\nFOLLOW FOR FOLLOW BACK INSTANTLY 💯 @confirm23262650\n\n@RadioGenoa @RadioPakistan @radiohead @astrotraffic @BBCR1 @iHeartRadio @nhk_radio_news @radiodisney @airnewsalerts @RadioElshinta @RadiostatsApp @radios https://t.co/9la7ujnO0O",
        "author_id": "1717052649869299712",
        "id": "1937342281524346938"
      },
      {
        "edit_history_tweet_ids": ["1937342279280455894"],
        "text": "RT @MattWalshBlog: Trump has effectively closed the border, which is a huge achievement. The problem is that the next Dem administration ca…",
        "author_id": "1737763281530695680",
        "id": "1937342279280455894"
      },
      {
        "edit_history_tweet_ids": ["1937342276310561070"],
        "text": "@KOKO_Mascot Follow me back fam 𝗜 𝗵𝗮𝘃𝗲 𝘁𝗵𝗲 Special 𝗽𝗿𝗼𝗽𝗼𝘀𝗮𝗹 𝗳𝗼𝗿 𝘆𝗼𝘂 !! 𝗖𝗼𝗻𝘁𝗮𝗰𝘁 𝗺𝗲 𝗽𝗹𝘀 📩📩",
        "author_id": "1453981808337375242",
        "id": "1937342276310561070"
      },
      {
        "edit_history_tweet_ids": ["1937342271692898671"],
        "text": "RT @B_Naughtyyy: Been on hiatus for couple of weeks and here we go again, bounce back tas jakol na malupet! Hahaha huyyy ems😂🫣\n\nGreat day a…",
        "author_id": "1834136165412466688",
        "id": "1937342271692898671"
      },
      {
        "edit_history_tweet_ids": ["1937342260053512227"],
        "text": "@DespinaChrista5 @DespinaChrista5 \nI came across your GoFundMe and truly admire your dedication to the cause. I'd love to support your efforts and explore how I can contribute.\n\nSHARE your GoFundMe link in my inbox now and Follow Back I will love to support now.",
        "author_id": "1868893049171906560",
        "id": "1937342260053512227"
      },
      {
        "edit_history_tweet_ids": ["1937342256505049401"],
        "text": "RT @iamjuliacruze: Comment and i follow you back (serious) https://t.co/9tt8vwia3i",
        "author_id": "1909603819010637829",
        "id": "1937342256505049401"
      },
      {
        "edit_history_tweet_ids": ["1937342253577523353"],
        "text": "RT @johnpauldooga: I'm following anyone who follow me back immediately \n\nLET'S GO",
        "author_id": "1853087399980699649",
        "id": "1937342253577523353"
      },
      {
        "edit_history_tweet_ids": ["1937342251572601122"],
        "text": "@bestbilk Hello dear kindly follow me back 🙂 Do you want me to play with your cock 😚?",
        "author_id": "1872423839470358528",
        "id": "1937342251572601122"
      },
      {
        "edit_history_tweet_ids": ["1937342247265272142"],
        "text": "RT @__Awesomest__: If I didn’t follow you back, it’s not personal, don’t unfollow. I’m slaying bots & stupid twats - I sometimes miss ya re…",
        "author_id": "1730538062051250176",
        "id": "1937342247265272142"
      }
    ]
  }
};


// Helper function to delay between actions
function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// Main bot logic
async function runBot(searchResult) {
  const keyword = "follow back";

  try {
    console.log(`🔍 Processing tweets with keyword "${keyword}" from mock data...`);

    const tweets = searchResult?._realData?.data || [];
    if (tweets.length === 0) {
      console.log('❌ No tweets found in the mock data.');
      return;
    }

    // Fetch your authenticated user's ID (real app scenario)
    const me = await rwClient.v2.me();
    const myUserId = me.data.id;

    console.log(`\n--- Starting Interactions (as user ${myUserId}) ---\n`);

    for (const tweet of tweets) {
      const tweetId = tweet.id;
      const authorId = tweet.author_id;

      try {
        console.log(`▶️ Interacting with Tweet ID: ${tweetId} from Author ID: ${authorId}`);
        console.log(`   Tweet Text: "${tweet.text.replace(/\n/g, ' ').slice(0, 70)}..."`);

        // Like the tweet
        await rwClient.v2.like(myUserId, tweetId);

        // Reply to the tweet
        await rwClient.v2.tweet({
          text: 'fb 🔁',
          reply: { in_reply_to_tweet_id: tweetId },
        });

        // Follow the author
        await rwClient.v2.follow(myUserId, authorId);

        console.log(`✅ Finished interaction with tweet ${tweetId}.`);
      } catch (err) {
        console.error(`⚠️ Failed to process tweet ${tweetId}:`, err);
      }

      await delay(1000); // Wait 1s before next interaction
    }

    console.log(`\n--- All mock interactions complete. ---`);
  } catch (err) {
    console.error('❌ An unexpected error occurred:', err.message);
  }
}

// Run the bot with mock data
console.log('🚀 Starting bot with mock data...');
runBot(mockResult);
