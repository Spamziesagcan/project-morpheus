"""
Job Readiness API - FastAPI Application
Main entry point for the job readiness scoring system
"""
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import io

from models import (
    AnalysisResponse, ATSScore, SkillGapAnalysis, 
    JobReadinessScore
)
from parsers import ResumeParser, JobDescriptionParser
from skill_gap_analyzer import SkillGapAnalyzer
from ats_scorer import ATSScorer
from job_readiness_scorer import JobReadinessScorer

# Initialize FastAPI app
app = FastAPI(
    title="Job Readiness Scoring API",
    description="Analyze resumes against job descriptions for readiness, ATS compatibility, and skill gaps",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
resume_parser = ResumeParser()
jd_parser = JobDescriptionParser()
skill_gap_analyzer = SkillGapAnalyzer(match_threshold=75)
ats_scorer = ATSScorer()
readiness_scorer = JobReadinessScorer()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Job Readiness Scoring API",
        "version": "1.0.0",
        "endpoints": {
            "analyze": "/api/analyze",
            "ats_score": "/api/ats-score",
            "skill_gap": "/api/skill-gap",
            "job_readiness": "/api/job-readiness"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_complete(
    resume_text: str = Form(..., description="Resume text content"),
    job_description: str = Form(..., description="Job description text")
):
    """
    Complete analysis: Job readiness score, ATS score, and skill gap analysis
    
    Args:
        resume_text: Full text of the resume
        job_description: Full text of the job description
        
    Returns:
        Complete analysis with all scores and recommendations
    """
    try:
        # Parse resume and job description
        parsed_resume = resume_parser.parse(resume_text)
        parsed_jd = jd_parser.parse(job_description)
        
        # Perform analyses
        skill_gap = skill_gap_analyzer.analyze(parsed_resume, parsed_jd)
        ats_score = ats_scorer.score(parsed_resume, parsed_jd)
        readiness_score = readiness_scorer.score(parsed_resume, parsed_jd, skill_gap)
        
        # Generate summary
        summary = _generate_summary(readiness_score, ats_score, skill_gap)
        
        return AnalysisResponse(
            job_readiness_score=readiness_score,
            ats_score=ats_score,
            skill_gap_analysis=skill_gap,
            summary=summary
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/ats-score", response_model=ATSScore)
async def get_ats_score(
    resume_text: str = Form(..., description="Resume text content"),
    job_description: str = Form(..., description="Job description text")
):
    """
    Get ATS (Applicant Tracking System) score only
    
    Args:
        resume_text: Full text of the resume
        job_description: Full text of the job description
        
    Returns:
        ATS score with detailed breakdown
    """
    try:
        parsed_resume = resume_parser.parse(resume_text)
        parsed_jd = jd_parser.parse(job_description)
        
        ats_score = ats_scorer.score(parsed_resume, parsed_jd)
        
        return ats_score
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ATS scoring failed: {str(e)}")


@app.post("/api/skill-gap", response_model=SkillGapAnalysis)
async def get_skill_gap(
    resume_text: str = Form(..., description="Resume text content"),
    job_description: str = Form(..., description="Job description text")
):
    """
    Get skill gap analysis only
    
    Args:
        resume_text: Full text of the resume
        job_description: Full text of the job description
        
    Returns:
        Skill gap analysis with matched and missing skills
    """
    try:
        parsed_resume = resume_parser.parse(resume_text)
        parsed_jd = jd_parser.parse(job_description)
        
        skill_gap = skill_gap_analyzer.analyze(parsed_resume, parsed_jd)
        
        return skill_gap
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Skill gap analysis failed: {str(e)}")


@app.post("/api/job-readiness", response_model=JobReadinessScore)
async def get_job_readiness(
    resume_text: str = Form(..., description="Resume text content"),
    job_description: str = Form(..., description="Job description text")
):
    """
    Get job readiness score only
    
    Args:
        resume_text: Full text of the resume
        job_description: Full text of the job description
        
    Returns:
        Job readiness score with component breakdown
    """
    try:
        parsed_resume = resume_parser.parse(resume_text)
        parsed_jd = jd_parser.parse(job_description)
        
        # Need skill gap for readiness calculation
        skill_gap = skill_gap_analyzer.analyze(parsed_resume, parsed_jd)
        readiness_score = readiness_scorer.score(parsed_resume, parsed_jd, skill_gap)
        
        return readiness_score
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Job readiness scoring failed: {str(e)}")


@app.post("/api/parse-resume")
async def parse_resume(
    resume_text: str = Form(..., description="Resume text content")
):
    """
    Parse resume and extract structured information
    
    Args:
        resume_text: Full text of the resume
        
    Returns:
        Parsed resume with extracted sections
    """
    try:
        parsed_resume = resume_parser.parse(resume_text)
        return parsed_resume
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {str(e)}")


@app.post("/api/parse-job-description")
async def parse_job_description(
    job_description: str = Form(..., description="Job description text")
):
    """
    Parse job description and extract requirements
    
    Args:
        job_description: Full text of the job description
        
    Returns:
        Parsed job description with extracted requirements
    """
    try:
        parsed_jd = jd_parser.parse(job_description)
        return parsed_jd
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Job description parsing failed: {str(e)}")


def _generate_summary(
    readiness_score: JobReadinessScore,
    ats_score: ATSScore,
    skill_gap: SkillGapAnalysis
) -> str:
    """Generate a human-readable summary of the analysis"""
    
    overall = readiness_score.overall_score
    
    # Determine readiness level
    if overall >= 80:
        readiness_level = "Excellent"
        readiness_desc = "You are a strong candidate for this position."
    elif overall >= 70:
        readiness_level = "Good"
        readiness_desc = "You are a competitive candidate with some room for improvement."
    elif overall >= 60:
        readiness_level = "Fair"
        readiness_desc = "You meet many requirements but have notable gaps."
    elif overall >= 50:
        readiness_level = "Below Average"
        readiness_desc = "You have significant gaps compared to the job requirements."
    else:
        readiness_level = "Poor"
        readiness_desc = "This position may not be a good match for your current profile."
    
    # Build summary
    summary_parts = [
        f"Job Readiness: {readiness_level} ({overall:.1f}/100)",
        f"",
        readiness_desc,
        f"",
        f"Key Metrics:",
        f"• Skill Match: {skill_gap.skill_match_percentage:.1f}% ({skill_gap.matched_required_count}/{skill_gap.total_required_skills} required skills)",
        f"• ATS Score: {ats_score.overall_score:.1f}/100",
        f"• Experience Relevance: {readiness_score.experience_score:.1f}/100",
        f"• Education Match: {readiness_score.education_score:.1f}/100"
    ]
    
    # Add strengths
    if readiness_score.strengths:
        summary_parts.append("")
        summary_parts.append("Strengths:")
        for strength in readiness_score.strengths[:3]:
            summary_parts.append(f"• {strength}")
    
    # Add areas for improvement
    if readiness_score.weaknesses:
        summary_parts.append("")
        summary_parts.append("Areas for Improvement:")
        for weakness in readiness_score.weaknesses[:3]:
            summary_parts.append(f"• {weakness}")
    
    # Add missing skills if any
    if skill_gap.missing_required_skills:
        summary_parts.append("")
        summary_parts.append("Missing Critical Skills:")
        for skill in skill_gap.missing_required_skills[:5]:
            summary_parts.append(f"• {skill}")
    
    return "\n".join(summary_parts)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
