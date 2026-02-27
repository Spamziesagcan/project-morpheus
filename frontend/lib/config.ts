/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    SIGNUP: `${API_BASE_URL}/auth/signup`,
    ME: `${API_BASE_URL}/auth/me`,
    GOOGLE_CALLBACK: `${API_BASE_URL}/auth/google/callback`,
  },
  PROFILE: {
    GET: `${API_BASE_URL}/profile`,
    UPDATE: `${API_BASE_URL}/profile`,
    UPLOAD_RESUME: `${API_BASE_URL}/profile/resume/upload`,
    GET_RESUME: `${API_BASE_URL}/profile/resume`,
    DELETE_RESUME: `${API_BASE_URL}/profile/resume`,
    EXTRACT_RESUME: `${API_BASE_URL}/profile/extract-resume`,
  },
  AI_RESUME: {
    ANALYZE: `${API_BASE_URL}/ai-resume-builder/analyze`,
    SAVE: `${API_BASE_URL}/ai-resume-builder/save`,
    GET_DATA: `${API_BASE_URL}/ai-resume-builder/resume-data`,
    GENERATE_PDF: `${API_BASE_URL}/ai-resume-builder/generate-pdf`,
  },
  PORTFOLIO: {
    DATA: `${API_BASE_URL}/portfolio/data`,
    DEPLOY: `${API_BASE_URL}/portfolio/deploy`,
    PUBLIC_DATA: (userId: string) => `${API_BASE_URL}/portfolio/${userId}/data`,
  },
  RESUME_ANALYZER: {
    ANALYZE: `${API_BASE_URL}/api/resume-analyzer/analyze`,
  },
  COLD_MAIL: {
    SEARCH_COMPANIES: `${API_BASE_URL}/api/cold-mail/search-companies`,
    GENERATE_TEMPLATE: `${API_BASE_URL}/api/cold-mail/generate-template`,
    BULK_SEND: `${API_BASE_URL}/api/cold-mail/bulk-send`,
  },
  JOBS: {
    RELEVANT: `${API_BASE_URL}/api/jobs/relevant`,
    ALL: `${API_BASE_URL}/api/jobs/all`,
    SAVE: `${API_BASE_URL}/api/jobs/save`,
    SAVED: `${API_BASE_URL}/api/jobs/saved`,
    TRIGGER_SCRAPE: `${API_BASE_URL}/api/jobs/trigger-scrape`,
  },
  CAREER: {
    CHAT: `${API_BASE_URL}/api/career/chat`,
    CHAT_STREAM: `${API_BASE_URL}/api/career/chat/stream`,
    RECOMMEND: `${API_BASE_URL}/api/career/recommend`,
    TRENDS: `${API_BASE_URL}/api/career/trends`,
    CONVERSATIONS: `${API_BASE_URL}/api/career/conversations`,
  },
} as const;
