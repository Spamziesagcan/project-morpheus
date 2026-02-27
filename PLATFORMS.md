# Platform Scrapers Overview

This document lists all platforms we're scraping in the SkillPath AI project.

---

## 🎓 **Learning Platforms** (Course Discovery)

### 1. **Coursera**
- **Status**: ✅ **Working**
- **Method**: Playwright with two-phase deep scraping
- **What we scrape**:
  - Course title, URL, description
  - Rating (when available)
  - Difficulty level
  - Duration (hours/weeks converted to minutes)
  - Enrollment count
  - Cost (Free/Paid)
- **API Key Required**: ❌ No
- **Tested**: ✅ Yes (5 courses with full metadata)
- **File**: `app/scrapers/coursera.py`
- **Notes**: Search results pages don't show metadata, so we visit individual course pages (slower but complete)

---

### 2. **Udemy**
We have **3 implementations** for Udemy due to Cloudflare blocking:

#### 2a. **Udemy (Playwright)** ❌
- **Status**: ❌ **Blocked by Cloudflare**
- **Method**: Playwright browser automation
- **Issue**: Cloudflare challenge page blocks all requests
- **File**: `app/scrapers/udemy.py`
- **Notes**: Original implementation, deprecated in favor of Exa AI

#### 2b. **Udemy (Exa AI)** ✅
- **Status**: ✅ **Working**
- **Method**: Exa AI semantic search
- **What we scrape**:
  - Course title, URL, description
  - Rating
  - Duration (hours)
  - Student count
  - Cost (Free/Paid)
  - Difficulty (inferred from text)
- **API Key Required**: ✅ Yes (EXA_API_KEY)
- **Pricing**: Free tier: 1,000 searches/month
- **Tested**: ✅ Yes (found courses with metadata)
- **File**: `app/scrapers/udemy_exa.py`
- **Notes**: Bypasses Cloudflare completely using AI search. Results depend on Exa's index coverage.

#### 2c. **Udemy (Apify)** 🔄
- **Status**: 🔄 **Not Tested** (backup solution)
- **Method**: Apify managed scraper (Actor: tugkan/udemy-scraper)
- **What we scrape**: Full course details via Apify's pre-built scraper
- **API Key Required**: ✅ Yes (APIFY_API_KEY)
- **Pricing**: Free tier: $5 credit/month
- **Tested**: ❌ Not yet
- **File**: `app/scrapers/udemy_apify.py`
- **Notes**: Alternative if Exa AI doesn't meet needs

---

### 3. **YouTube**
- **Status**: ✅ **Working**
- **Method**: YouTube Data API v3 (official API)
- **What we scrape**:
  - Video title, URL, description
  - Duration (ISO 8601 converted to minutes)
  - View count
  - Channel name
  - Difficulty (inferred from title/description)
  - Cost: Always Free
- **API Key Required**: ✅ Yes (YOUTUBE_API_KEY)
- **Pricing**: Free tier: 10,000 units/day (~100 searches)
- **Tested**: ✅ Yes (5 videos with full metadata)
- **File**: `app/scrapers/youtube.py`
- **Notes**: Clean API-based scraper, no browser automation needed

---

## 📝 **Content Platforms** (Articles & Tutorials)

### 4. **Medium**
- **Status**: ✅ **Working**
- **Method**: Playwright browser automation
- **What we scrape**:
  - Article title, URL
  - Author name
  - Read time (minutes)
  - Publication date
  - Claps count (engagement metric)
  - Cost: Mix of Free/Paid (Medium paywall)
- **API Key Required**: ❌ No
- **Tested**: ✅ Yes (5 articles with titles and URLs)
- **File**: `app/scrapers/medium.py`
- **Notes**: No public API available, scrapes search results page. Fixed link extraction to handle Medium's DOM structure.

---

### 5. **Dev.to**
- **Status**: ✅ **Working**
- **Method**: Dev.to/Forem REST API (official)
- **What we scrape**:
  - Article title, URL, description
  - Author, tags
  - Reading time (minutes)
  - Reactions (likes), comments count
  - Published date
  - Cost: Always Free
- **API Key Required**: ❌ No (public API)
- **Tested**: ✅ Yes (5 articles with full metadata)
- **File**: `app/scrapers/dev_to.py`
- **Notes**: Simple API-based scraper, very reliable. Public API with no authentication required.

---

## 📊 **Social Signal Platforms** (Community Engagement)

These platforms provide **social signals** (upvotes, comments, sentiment) about resources rather than being primary resource sources.

### 6. **Reddit**
- **Status**: ✅ **Working**
- **Method**: Reddit REST API (official, no auth required)
- **What we scrape**:
  - Posts/comments mentioning resource URLs or titles
  - Upvotes, downvotes
  - Comment content for sentiment analysis
  - Subreddit, author
  - Posted date
- **Target Subreddits**:
  - r/learnprogramming
  - r/webdev
  - r/programming
  - r/cscareerquestions
  - r/devops
  - r/datascience
  - r/MachineLearning
  - r/Python
  - r/javascript
  - And more...
- **API Key Required**: ✅ Yes (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD)
- **Tested**: ✅ Yes (23 posts/comments with upvotes and content)
- **File**: `app/scrapers/reddit.py`
- **Notes**: Used for credibility scoring via social engagement. Public API with authentication.

---

### 7. **X (Twitter)**
- **Status**: 🔄 **Not Tested**
- **Method**: Playwright browser automation
- **What we scrape**:
  - Tweets mentioning resource URLs or titles
  - Likes, retweets, replies count
  - Tweet content for sentiment analysis
  - Author, posted date
- **API Key Required**: ❌ No (uses browser automation)
- **Optional**: TWITTER_COOKIES env var for session cookies (more reliable)
- **Tested**: ❌ Not yet
- **File**: `app/scrapers/twitter_x.py`
- **Notes**: X deprecated free API in 2023, so we use Playwright. May hit rate limits.

---

## 📊 Summary Table

| Platform | Type | Status | Method | API Key | Tested |
|----------|------|--------|--------|---------|--------|
| **Coursera** | Learning | ✅ Working | Playwright | ❌ No | ✅ Yes |
| **Udemy (Playwright)** | Learning | ❌ Blocked | Playwright | ❌ No | ✅ Yes (blocked) |
| **Udemy (Exa AI)** | Learning | ✅ Working | Exa AI | ✅ EXA_API_KEY | ✅ Yes |
| **Udemy (Apify)** | Learning | 🔄 Backup | Apify API | ✅ APIFY_API_KEY | ❌ No |
| **YouTube** | Learning | ✅ Working | YouTube API | ✅ YOUTUBE_API_KEY | ✅ Yes |
| **Medium** | Content | ✅ Working | Playwright | ❌ No | ✅ Yes |
| **Dev.to** | Content | ✅ Working | Dev.to API | ❌ No | ✅ Yes |
| **Reddit** | Social | ✅ Working | Reddit API | ✅ REDDIT_CLIENT_ID | ✅ Yes |
| **X (Twitter)** | Social | 🔄 Ready | Playwright | ❌ No | ❌ No |

### Legend:
- ✅ **Working**: Tested and functional
- ❌ **Blocked**: Doesn't work due to blocking
- 🔄 **Ready**: Code exists but not tested yet

---

## 🔑 Required API Keys

To use all platforms, you'll need:

1. **EXA_API_KEY** - For Udemy (Exa AI)
   - Get it: https://dashboard.exa.ai/api-keys
   - Free tier: 1,000 searches/month

2. **YOUTUBE_API_KEY** - For YouTube
   - Get it: https://console.cloud.google.com/apis/credentials
   - Free tier: 10,000 units/day

3. **APIFY_API_KEY** - Optional, for Udemy (Apify) backup
   - Get it: https://console.apify.com/account/integrations
   - Free tier: $5 credit/month

4. **REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET** - For Reddit social signals
   - Get it: https://www.reddit.com/prefs/apps
   - Create a "script" app
   - Also need: REDDIT_USERNAME, REDDIT_PASSWORD, REDDIT_USER_AGENT

5. **TWITTER_COOKIES** - Optional, for more reliable X/Twitter scraping
   - Export cookies from logged-in session

---

## 🎯 Platform Categories

### **Primary Resource Discovery:**
- Coursera (courses)
- Udemy (courses)
- YouTube (video tutorials)
- Medium (articles)
- Dev.to (articles/tutorials)

### **Social Signal Collection:**
- Reddit (community discussions)
- X/Twitter (social mentions)

---

## 📈 Next Steps

### ✅ Testing Complete:
1. ✅ ~~Coursera~~ - **DONE** (Playwright, full metadata)
2. ✅ ~~Udemy (Exa AI)~~ - **DONE** (AI search, bypasses Cloudflare)
3. ✅ ~~YouTube~~ - **DONE** (YouTube Data API, full metadata)
4. ✅ ~~Dev.to~~ - **DONE** (REST API, full metadata)
5. ✅ ~~Medium~~ - **DONE** (Playwright, titles and URLs)
6. ✅ ~~Reddit~~ - **DONE** (Reddit API, 23 posts/comments with upvotes)

### 🔄 Remaining (Social Signals):
7. X/Twitter - Playwright-based, may face rate limits

### Optional:
8. Udemy (Apify) - Backup solution if Exa AI doesn't meet requirements

---

## 🛠️ Technical Notes

### Scraping Methods:
1. **Official APIs** (Preferred): YouTube, Dev.to, Reddit
   - Most reliable
   - No blocking concerns
   - Rate limits are clear

2. **Playwright Automation**: Coursera, Medium, X/Twitter
   - More fragile (depends on DOM structure)
   - May face blocking (Cloudflare, rate limits)
   - Requires stealth mode

3. **AI-Powered Search**: Udemy (Exa AI)
   - Bypasses blocking completely
   - Depends on search engine's index
   - API costs per search

4. **Managed Scrapers**: Udemy (Apify)
   - Handles blocking internally
   - Pre-built and maintained
   - API costs per run

### Anti-Bot Measures Encountered:
- **Cloudflare Challenge**: Udemy (solved with Exa AI)
- **Rate Limiting**: X/Twitter (mitigated with cookies)
- **Dynamic Content**: Medium (wait for JS rendering, fixed link extraction in h2 parent elements)

---

*Last updated: February 27, 2026*
