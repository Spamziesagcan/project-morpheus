# SkillSphere - Features Overview

A comprehensive career development platform with 14 AI-powered features.

---

## 1. Authentication & User Management
- **Signup/Login**: Email/password authentication with JWT tokens
- **Google OAuth**: One-click Google sign-in
- **User Profile**: Secure user data management

## 2. User Profile Management
- **Profile CRUD**: Manage skills, experience, education, projects, interests
- **Resume Upload/Download**: Store and retrieve resume PDFs (10MB limit)
- **AI Resume Extraction**: Parse PDF resumes and auto-populate profile

## 3. AI Resume Builder
- **Analyze Profile**: Convert profile data into structured resume format
- **Skill Categorization**: Auto-group skills (Languages, Tools, Cloud)
- **Resume Generation**: Create professional PDF resumes
- **History Tracking**: View all generated resumes

## 4. Portfolio Generator
- **Multiple Themes**: Terminal, modern, minimal, professional designs
- **One-Click Deploy**: Generate unique portfolio URL
- **Public Viewing**: Share portfolio without authentication
- **Auto-Update**: Sync with profile changes

## 5. Presentation Generator
- **AI Outline**: Generate presentation structure (5-50 slides)
- **Full Presentation**: Create detailed slide content with Gemini AI
- **Multi-Language**: English, Hindi, Spanish, etc.
- **Theme & Tone**: Customize appearance and writing style
- **PPTX Download**: Export as PowerPoint file
- **History**: Access previously generated presentations

## 6. Career Recommender
- **AI Career Paths**: Get 3-5 personalized career recommendations
- **Real-Time Data**: Web scraping of 2026 job market trends (Tavily)
- **Match Scores**: See how well careers fit your profile
- **Career Chat**: Interactive AI counselor for career guidance
- **Conversation History**: Save and resume career discussions
- **Trending Insights**: View in-demand skills and growing industries

## 7. Learning Roadmap Generator
- **AI Roadmaps**: Generate structured learning paths with Gemini
- **Multi-Source Resources**: YouTube, Udemy, Coursera (10+ per topic)
- **Mermaid Diagrams**: Visual roadmap representation
- **Smart Caching**: Reuse resources to avoid redundant API calls
- **Save & Favorite**: Build personal learning library
- **Progress Tracking**: Monitor learning journey

## 8. Job Application Generator
- **Tailored Resumes**: AI-customized resumes for specific jobs
- **Cover Letters**: Personalized letters for each application
- **ATS Optimization**: Keyword-optimized content
- **Application Tracking**: Manage all applications in one place
- **Status Updates**: Track progress (draft → submitted → interview → offer)
- **Export**: Download as professional PDF

## 9. Cold Mail Automation
- **Company Finder**: Scrape 100 companies by industry/keywords
- **Email Extraction**: Auto-find HR/recruitment emails
- **AI Templates**: Generate personalized cold emails with Gemini
- **Bulk Send**: Email up to 50 companies at once
- **Attachment Support**: Include resume with emails
- **History & Stats**: Track sent emails and response rates
- **Smart Filtering**: Exclude already-contacted companies

## 10. Job Tracker & Matcher
- **Auto Scraping**: Background job fetching every 6 hours
- **Multiple Sources**: LinkedIn, Indeed, ZipRecruiter, Glassdoor, etc.
- **AI Matching**: Rank jobs by skills match (0-100%)
- **Gap Analysis**: See which skills you're missing
- **Source Diversity**: Balanced results from multiple platforms
- **Save Jobs**: Bookmark and add notes to jobs
- **Real-Time**: Latest job postings updated automatically

## 11. Resume Analyzer
- **ATS Score**: Evaluate resume formatting (0-100)
- **Readiness Score**: Assess job fit (0-100)
- **Match Percentage**: Overall compatibility with job
- **Strengths & Gaps**: Identify what you have and what's missing
- **Actionable Tips**: Specific improvement suggestions
- **Recommendations**: Strategic advice for optimization

## 12. Flashcards Generator
- **Multi-Source Input**: Text, URL, or PDF
- **AI Generation**: Create 5-50 study cards with Gemini
- **Difficulty Levels**: Easy, medium, hard classification
- **Customizable**: Adjust card count and word limits
- **Save Sets**: Build flashcard library
- **Active Recall**: Interview and exam preparation focus

## 13. AI Interview Agent
- **Voice Interviews**: Real-time AI interviewer with Vapi.ai
- **10 Questions**: Structured format (3 easy, 3 medium, 4 hard)
- **Resume-Based**: Questions tailored to your background
- **Auto Evaluation**: GPT-4o-mini analyzes responses
- **Detailed Reports**: Scores, feedback, and improvement tips
- **Question Analysis**: Individual scoring and suggestions
- **Skill Assessment**: Technical, communication, problem-solving metrics

## 14. Explainer Agent
- **AI Explanations**: Break down complex topics with Gemini
- **Multi-Source**: Text, URL, or PDF input
- **Complexity Levels**: Simple (ELI5), medium, advanced
- **Personalization**: Adapts to age, education, learning style
- **Interactive Chat**: Ask follow-up questions about content
- **Save Library**: Store explanations with notes
- **8 Components**: Summary, explanation, concepts, analogies, examples, tips, related topics, resources

---

## Technology Stack

**Backend**: FastAPI, MongoDB, Gemini AI, GPT-4o-mini, Tavily, Vapi.ai  
**Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui  
**Infrastructure**: Docker, Google Cloud Platform

---

## Security & Performance

- JWT authentication & bcrypt password hashing
- MongoDB caching for optimization
- Async processing & parallel API calls
- Rate limiting & input validation
- CORS & error handling

---

**Platform**: SkillSphere - Your Career Growth Partner  
**Version**: 1.0.0 | **Last Updated**: March 7, 2026
