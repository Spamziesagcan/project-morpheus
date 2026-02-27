# SkillPath AI - Backend

> **AI-powered learning path generator that bridges the gap between your current skills and your dream job.**

---

## 🎯 What is SkillPath AI?

SkillPath AI solves the **"Knowledge-to-Hireable Gap"** - helping professionals learn exactly what they need, not what they don't. Instead of spending countless hours on irrelevant courses, get a personalized roadmap that shows:

- ✅ **What skills you're missing** for your target role
- ✅ **What order to learn them** (respecting skill dependencies)
- ✅ **Where to learn them** (curated resources from across the web)
- ✅ **Why each skill matters** (credibility scores based on community sentiment)

### How It Works

```
Input: Current Role + Target Role + Known Skills
         ↓
   AI Analysis & Gap Detection
         ↓
  Graph-Based Learning Roadmap
         ↓
Output: Personalized Path with Curated Resources
```

---

## 🏗️ Architecture Overview

### Tech Stack

**Backend Framework**:
- **FastAPI** - Modern async Python web framework
- **PostgreSQL** - Relational database with async support (asyncpg)
- **SQLAlchemy** - ORM with async capabilities
- **Pydantic** - Data validation and settings management

**Web Scraping**:
- **Playwright** - Browser automation for modern web apps
- **playwright-stealth** - Bot detection evasion
- **BeautifulSoup4** - HTML parsing
- **Exa AI** - AI-powered semantic search (for Cloudflare bypass)
- **Apify** - Pre-built scraper actors (optional)

**AI & NLP**:
- **Google Gemini** - AI-powered sentiment analysis
- **VADER** - Rule-based sentiment analysis
- **YouTube Data API** - Video metadata extraction

**Background Tasks**:
- **APScheduler** - Scheduled resource updates and scraping

---

## 📦 Current Features

### ✅ Implemented

#### 1. **Multi-Platform Resource Scraping**
Automatically discovers and indexes learning resources from:

| Platform | Status | Method | Metadata Extracted |
|----------|--------|--------|-------------------|
| **Coursera** | ✅ Working | Playwright + Deep Scraping | Rating, Difficulty, Duration, Enrollments |
| **Udemy** | ✅ Working | Exa AI Search | Title, URL, Content Highlights |
| **YouTube** | 🔍 Ready | YouTube Data API | Views, Likes, Duration |
| **Medium** | 🔍 Ready | Playwright | Article content |
| **Dev.to** | 🔍 Ready | Playwright | Tech articles |
| **Reddit** | 🔍 Ready | PRAW API | Community discussions |
| **Twitter/X** | 🔍 Ready | Playwright | Expert insights |

**Note**: Udemy uses Exa AI to bypass Cloudflare protection. See [APIFY_SETUP.md](APIFY_SETUP.md) for alternative solutions.

#### 2. **Intelligent Metadata Extraction**
For each resource, we extract:
- 🎯 **Title** - Course/article name
- ⭐ **Rating** - User ratings (when available)
- 📊 **Difficulty** - Beginner/Intermediate/Advanced
- ⏱️ **Duration** - Time investment required
- 👥 **Enrollments** - Popularity metrics
- 💰 **Cost** - Free/Paid/Subscription
- 🏷️ **Skills** - Mapped to skill taxonomy

#### 3. **Two-Phase Scraping Strategy**
**Phase 1**: Collect basic info from search results
- Fast overview of available courses
- Filters out skeleton/placeholder elements
- Deduplicates results

**Phase 2**: Deep metadata extraction
- Visits individual course pages
- Extracts detailed metadata not visible in search
- Handles missing data gracefully

**Example**: Coursera scraper
- Search page: Finds 5-10 courses in ~5 seconds
- Deep scraping: Visits each page for ratings/difficulty (~3 seconds per course)
- Total: ~20 seconds for 5 fully-detailed courses

#### 4. **Credibility Scoring System**
Multi-factor credibility algorithm weighing:
- **Resource Metadata** (35%) - Rating, enrollments, duration
- **Community Sentiment** (30%) - Reddit/Twitter discussions
- **Platform Engagement** (20%) - Views, likes, shares
- **Time Decay** (15%) - Recency factor

#### 5. **Database Models**
- **Users** - Profile and authentication
- **Skills** - Canonical skill taxonomy with relationships
- **Resources** - Learning materials with metadata
- **Learning Paths** - Generated roadmaps
- **Progress Tracking** - User completion tracking
- **Social Signals** - Community sentiment data

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+**
- **PostgreSQL 14+**
- **Node.js** (for Playwright browsers)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd be-a-learner
   ```

2. **Create virtual environment**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   # source .venv/bin/activate  # Linux/Mac
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install Playwright browsers**
   ```bash
   playwright install chromium
   ```

5. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and database credentials
   ```

6. **Initialize database**
   ```bash
   python scripts/init_db.py
   ```

---

## 🔑 API Keys Setup

### Required Keys

#### 1. **Exa AI** (for Udemy scraping)
- Sign up: https://exa.ai
- Get key: https://dashboard.exa.ai/api-keys
- Free tier: 1,000 searches/month
- Add to `.env`: `EXA_API_KEY=your_key_here`

#### 2. **Google Gemini** (for AI sentiment analysis)
- Get key: https://makersuite.google.com/app/apikey
- Free tier: 60 requests/minute
- Add to `.env`: `GEMINI_API_KEY=your_key_here`

### Optional Keys

#### 3. **YouTube Data API** (for video scraping)
- Create project: https://console.cloud.google.com/
- Enable YouTube Data API v3
- Create credentials → API Key
- Add to `.env`: `YOUTUBE_API_KEY=your_key_here`

#### 4. **Reddit API** (for community sentiment)
- Create app: https://www.reddit.com/prefs/apps
- Add to `.env`:
  ```
  REDDIT_CLIENT_ID=your_client_id
  REDDIT_CLIENT_SECRET=your_secret
  ```

#### 5. **Apify** (alternative Udemy solution)
- Optional if Exa AI works
- See [APIFY_SETUP.md](APIFY_SETUP.md) for details

---

## 🧪 Testing the Scrapers

### Test All Scrapers
```bash
python test_scrapers.py
```

### Test Coursera (Working)
```bash
# The Coursera scraper is fully functional with deep metadata extraction
python -c "
import asyncio
from app.scrapers.coursera import CourseraScraper

async def test():
    scraper = CourseraScraper()
    results = await scraper.scrape('Python Docker', max_results=5)
    for r in results:
        print(f'{r.title} - {r.platform_rating} - {r.difficulty}')

asyncio.run(test())
"
```

### Test Udemy (Exa AI)
```bash
# Requires EXA_API_KEY in .env
python test_exa_udemy.py
```

---

## 📂 Project Structure

```
be-a-learner/
├── app/
│   ├── api/                    # FastAPI routes
│   │   └── v1/
│   │       ├── resources.py    # Resource endpoints
│   │       └── scraper.py      # Scraping endpoints
│   ├── models/                 # SQLAlchemy models
│   │   ├── resource.py         # Learning resources
│   │   ├── skill.py            # Skills taxonomy
│   │   └── social_signal.py    # Community sentiment
│   ├── schemas/                # Pydantic schemas
│   │   ├── resource.py         # Resource validation
│   │   └── social_signal.py    # Sentiment data
│   ├── scrapers/               # Platform scrapers
│   │   ├── base.py             # Base scraper class
│   │   ├── coursera.py         # ✅ Working
│   │   ├── udemy.py            # ❌ Blocked by Cloudflare
│   │   ├── udemy_exa.py        # ✅ Working (Exa AI)
│   │   ├── udemy_apify.py      # 🔄 Working (requires API key)
│   │   ├── youtube.py          # 🔍 Ready to test
│   │   ├── medium.py           # 🔍 Ready to test
│   │   ├── dev_to.py           # 🔍 Ready to test
│   │   ├── reddit.py           # 🔍 Ready to test
│   │   └── twitter_x.py        # 🔍 Ready to test
│   ├── sentiment/              # Sentiment analysis
│   │   ├── composite.py        # Combined scoring
│   │   ├── gemini_analyzer.py  # AI-powered
│   │   └── vader_analyzer.py   # Rule-based
│   ├── services/               # Business logic
│   │   ├── credibility_service.py
│   │   ├── resource_service.py
│   │   └── social_signal_service.py
│   ├── config.py               # Settings management
│   ├── database.py             # DB connection
│   └── main.py                 # FastAPI app
├── scripts/
│   ├── init_db.py              # Database initialization
│   └── manage_resources.py     # Resource management CLI
├── docker-compose.yml          # Docker setup
├── Dockerfile                  # Container image
├── requirements.txt            # Python dependencies
├── .env.example                # Environment template
├── README.md                   # This file
├── APIFY_SETUP.md             # Apify integration guide
└── guide.md                    # Architecture deep-dive
```

---

## 🔧 Development

### Run the API Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Access the API docs at: http://localhost:8000/docs

### Database Migrations
```bash
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Docker Setup
```bash
docker-compose up -d
```

---

## 🧠 How the Scraping Works

### Problem: Cloudflare Bot Detection
Many course platforms (especially Udemy) use Cloudflare to block automated scrapers. Standard Playwright gets blocked.

### Solutions Implemented

#### Solution 1: Enhanced Stealth Mode (Coursera)
```python
# Base scraper with stealth techniques
class PlaywrightScraper:
    - Removes webdriver flags
    - Spoofs navigator properties
    - Uses realistic user agents
    - Adds random delays
    - Blocks images/fonts for performance
```
**Status**: ✅ Works for Coursera

#### Solution 2: Exa AI Semantic Search (Udemy)
```python
# AI-powered search that bypasses Cloudflare
response = exa.search_and_contents(
    "Python Docker site:udemy.com/course/",
    num_results=5,
    highlights=True
)
```
**Status**: ✅ Works for Udemy (requires API key)

#### Solution 3: Apify Pre-Built Actors (Optional)
```python
# Use Apify's managed scrapers with built-in bypass
actor = client.actor("tugkan/udemy-scraper")
run = actor.call(run_input={"searchKeyword": "Python"})
```
**Status**: 🔄 Available (see [APIFY_SETUP.md](APIFY_SETUP.md))

---

## 📊 Current Status & Roadmap

### ✅ Completed
- [x] FastAPI backend with async support
- [x] PostgreSQL database with SQLAlchemy ORM
- [x] Coursera scraper with deep metadata extraction
- [x] Exa AI integration for Udemy
- [x] Credibility scoring algorithm
- [x] Two-phase scraping strategy
- [x] Stealth mode for bot detection evasion
- [x] Environment configuration system

### 🔄 In Progress
- [ ] Testing YouTube/Medium/Dev.to scrapers
- [ ] Sentiment analysis pipeline
- [ ] Learning path generation algorithm

### 📋 Planned
- [ ] User authentication system
- [ ] Progress tracking implementation
- [ ] Graph-based skill dependency visualization
- [ ] API rate limiting
- [ ] Caching layer (Redis)
- [ ] Background scraping scheduler
- [ ] Admin dashboard
- [ ] Frontend integration

---

## 🐛 Known Issues

### Udemy Cloudflare Blocking
**Problem**: Standard Playwright scraper blocked by Cloudflare  
**Status**: ❌ Blocked  
**Solution**: Use Exa AI scraper (`udemy_exa.py`) or Apify (`udemy_apify.py`)

### Coursera Missing Ratings
**Problem**: 4 out of 5 courses show `rating: None`  
**Status**: ⚠️ Expected behavior  
**Explanation**: Many courses don't have ratings displayed yet. This is normal.

### Playwright Stealth Limitations
**Problem**: playwright-stealth doesn't bypass modern Cloudflare  
**Status**: ⚠️ Known limitation  
**Solution**: Use AI-powered search (Exa) or managed scrapers (Apify)

---

## 🤝 Contributing

Contributions welcome! Areas that need help:
- Testing scrapers for YouTube/Medium/Dev.to/Reddit/Twitter
- Improving metadata extraction accuracy
- Adding new learning platforms
- Optimizing scraping performance
- Documentation improvements

---

## 📄 License

[Your License Here]

---

## 📧 Contact

[Your Contact Info]

---

## 🙏 Acknowledgments

- **Playwright** - Powerful browser automation
- **Exa AI** - AI-powered web search
- **FastAPI** - Modern Python web framework
- **Google Gemini** - AI sentiment analysis

---

## 📚 Additional Documentation

- [Architecture Deep Dive](guide.md) - Detailed system design
- [Apify Setup Guide](APIFY_SETUP.md) - Alternative Udemy scraping
- [API Documentation](http://localhost:8000/docs) - Interactive API docs (when server is running)
