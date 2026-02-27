"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import date


class Education(BaseModel):
    """Education entry"""
    degree: str
    field: Optional[str] = None
    institution: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    gpa: Optional[float] = None


class Experience(BaseModel):
    """Work experience entry"""
    title: str
    company: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: str
    skills_used: List[str] = []


class Project(BaseModel):
    """Project entry"""
    name: str
    description: str
    technologies: List[str] = []
    url: Optional[str] = None


class ParsedResume(BaseModel):
    """Parsed resume structure"""
    raw_text: str
    contact_info: Dict[str, Any] = {}
    skills: List[str] = []
    education: List[Education] = []
    experience: List[Experience] = []
    projects: List[Project] = []
    certifications: List[str] = []
    summary: Optional[str] = None


class ParsedJobDescription(BaseModel):
    """Parsed job description structure"""
    raw_text: str
    job_title: str
    company: Optional[str] = None
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    required_experience_years: Optional[int] = None
    required_education: List[str] = []
    responsibilities: List[str] = []
    qualifications: List[str] = []


class SkillMatch(BaseModel):
    """Individual skill match details"""
    skill: str
    matched: bool
    match_score: float
    matched_with: Optional[str] = None


class SkillGapAnalysis(BaseModel):
    """Skill gap analysis result"""
    matched_skills: List[SkillMatch]
    missing_required_skills: List[str]
    missing_preferred_skills: List[str]
    total_required_skills: int
    matched_required_count: int
    skill_match_percentage: float
    recommendations: List[str] = []


class ATSScore(BaseModel):
    """ATS scoring result"""
    overall_score: float
    keyword_match_score: float
    formatting_score: float
    section_completeness_score: float
    details: Dict[str, Any] = {}
    recommendations: List[str] = []


class JobReadinessScore(BaseModel):
    """Job readiness scoring result"""
    overall_score: float
    skill_score: float
    experience_score: float
    education_score: float
    project_score: float
    breakdown: Dict[str, Any] = {}
    strengths: List[str] = []
    weaknesses: List[str] = []


class AnalysisRequest(BaseModel):
    """Request model for job analysis"""
    resume_text: Optional[str] = None
    job_description: str
    resume_file: Optional[bytes] = None


class AnalysisResponse(BaseModel):
    """Complete analysis response"""
    job_readiness_score: JobReadinessScore
    ats_score: ATSScore
    skill_gap_analysis: SkillGapAnalysis
    summary: str
