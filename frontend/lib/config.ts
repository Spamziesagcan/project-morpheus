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
  PRESENTATION: {
    OUTLINE: `${API_BASE_URL}/presentation/outline`,
    GENERATE: `${API_BASE_URL}/presentation/generate`,
    DOWNLOAD: `${API_BASE_URL}/presentation/download`,
    HISTORY: `${API_BASE_URL}/presentation/history`,
    HISTORY_BY_ID: (pptId: number) => `${API_BASE_URL}/presentation/history/${pptId}`,
  },
  CAREER: {
    CHAT_STREAM: `${API_BASE_URL}/api/career/chat/stream`,
    CONVERSATIONS_BY_USER: (userId: string) =>
      `${API_BASE_URL}/api/career/conversations/${userId}`,
    CONVERSATION_DETAIL: (userId: string, conversationId: string) =>
      `${API_BASE_URL}/api/career/conversations/${userId}/${conversationId}`,
  },
} as const;
