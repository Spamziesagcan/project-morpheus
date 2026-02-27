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
  RESUME_ANALYZER: {
    ANALYZE: `${API_BASE_URL}/api/resume-analyzer/analyze`,
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
  PRESENTATION: {
    OUTLINE: `${API_BASE_URL}/presentation/outline`,
    GENERATE: `${API_BASE_URL}/presentation/generate`,
    DOWNLOAD: `${API_BASE_URL}/presentation/download`,
    HISTORY: `${API_BASE_URL}/presentation/history`,
    HISTORY_BY_ID: (pptId: number) => `${API_BASE_URL}/presentation/history/${pptId}`,
  },
  CAREER: {
    CHAT_STREAM: `${API_BASE_URL}/api/career/chat/stream`,
    SPEECH_TO_TEXT: `${API_BASE_URL}/api/career/speech-to-text`,
    CONVERSATIONS_BY_USER: (userId: string) =>
      `${API_BASE_URL}/api/career/conversations/${userId}`,
    CONVERSATION_DETAIL: (userId: string, conversationId: string) =>
      `${API_BASE_URL}/api/career/conversations/${userId}/${conversationId}`,
  },
  LEARNING: {
    GENERATE_ROADMAP: `${API_BASE_URL}/api/learning/generate-roadmap`,
    SAVE_ROADMAP: `${API_BASE_URL}/api/learning/save-roadmap`,
    GET_ROADMAPS: `${API_BASE_URL}/api/learning/roadmaps`,
    GET_ROADMAP: (id: string) => `${API_BASE_URL}/api/learning/roadmaps/${id}`,
    DELETE_ROADMAP: (id: string) => `${API_BASE_URL}/api/learning/roadmaps/${id}`,
    TOGGLE_FAVORITE: (id: string) =>
      `${API_BASE_URL}/api/learning/roadmaps/${id}/favorite`,
  },
  FLASHCARDS: {
    GENERATE: `${API_BASE_URL}/api/flashcards/generate`,
    SAVE: `${API_BASE_URL}/api/flashcards/save`,
    HISTORY: `${API_BASE_URL}/api/flashcards/history`,
    HISTORY_DETAIL: (flashcardId: number) =>
      `${API_BASE_URL}/api/flashcards/history/${flashcardId}`,
  },
  JOBS: {
    RELEVANT: (limit: number = 50) =>
      `${API_BASE_URL}/api/jobs/relevant?limit=${limit}`,
    SAVED: `${API_BASE_URL}/api/jobs/saved`,
    SAVE: `${API_BASE_URL}/api/jobs/save`,
    TRIGGER_SCRAPE: `${API_BASE_URL}/api/jobs/trigger-scrape`,
  },
  JOB_APPLICATION: {
    GENERATE: `${API_BASE_URL}/api/job-application/generate`,
    SAVE: `${API_BASE_URL}/api/job-application/save`,
    LIST: `${API_BASE_URL}/api/job-application/my-applications`,
    DELETE: (jobId: string) =>
      `${API_BASE_URL}/api/job-application/delete/${jobId}`,
  },
  COLD_MAIL: {
    SEARCH_COMPANIES: `${API_BASE_URL}/api/cold-mail/search-companies`,
    GENERATE_TEMPLATE: `${API_BASE_URL}/api/cold-mail/generate-template`,
    BULK_SEND: `${API_BASE_URL}/api/cold-mail/bulk-send`,
    SEND_EMAIL: `${API_BASE_URL}/api/cold-mail/send-email`,
  },
  INTERVIEW: {
    START: `${API_BASE_URL}/api/interview/start`,
    STATUS: (interviewId: string) =>
      `${API_BASE_URL}/api/interview/${interviewId}/status`,
    REPORT: (interviewId: string) =>
      `${API_BASE_URL}/api/interview/${interviewId}/report`,
    GENERATE_REPORT: (interviewId: string) =>
      `${API_BASE_URL}/api/interview/${interviewId}/generate-report`,
  },
} as const;
