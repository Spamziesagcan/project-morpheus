"""
Skill Gap Analysis
Analyzes the gap between candidate skills and job requirements
"""
from typing import List
from models import (
    ParsedResume, ParsedJobDescription, 
    SkillGapAnalysis, SkillMatch
)
from utils import fuzzy_match_skill, normalize_skill


class SkillGapAnalyzer:
    """Analyze skill gaps between resume and job description"""
    
    def __init__(self, match_threshold: int = 75):
        """
        Initialize analyzer
        
        Args:
            match_threshold: Minimum fuzzy match score to consider a skill matched (0-100)
        """
        self.match_threshold = match_threshold
    
    def analyze(
        self, 
        resume: ParsedResume, 
        job_desc: ParsedJobDescription
    ) -> SkillGapAnalysis:
        """
        Perform skill gap analysis
        
        Args:
            resume: Parsed resume
            job_desc: Parsed job description
            
        Returns:
            SkillGapAnalysis with detailed results
        """
        # Normalize resume skills
        resume_skills = [normalize_skill(skill) for skill in resume.skills]
        
        # Add skills from experience and projects
        for exp in resume.experience:
            resume_skills.extend([normalize_skill(s) for s in exp.skills_used])
        
        for proj in resume.projects:
            resume_skills.extend([normalize_skill(s) for s in proj.technologies])
        
        # Remove duplicates
        resume_skills = list(set(resume_skills))
        
        # Analyze required skills
        required_matches = self._match_skills(
            resume_skills, 
            job_desc.required_skills
        )
        
        # Analyze preferred skills
        preferred_matches = self._match_skills(
            resume_skills,
            job_desc.preferred_skills
        )
        
        # Combine all matches
        all_matches = required_matches + preferred_matches
        
        # Find missing required skills
        missing_required = [
            skill for skill in job_desc.required_skills
            if not any(m.skill == skill and m.matched for m in required_matches)
        ]
        
        # Find missing preferred skills
        missing_preferred = [
            skill for skill in job_desc.preferred_skills
            if not any(m.skill == skill and m.matched for m in preferred_matches)
        ]
        
        # Calculate match percentage
        total_required = len(job_desc.required_skills)
        matched_required = len([m for m in required_matches if m.matched])
        
        match_percentage = (matched_required / total_required * 100) if total_required > 0 else 0
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            missing_required,
            missing_preferred,
            match_percentage
        )
        
        return SkillGapAnalysis(
            matched_skills=all_matches,
            missing_required_skills=missing_required,
            missing_preferred_skills=missing_preferred,
            total_required_skills=total_required,
            matched_required_count=matched_required,
            skill_match_percentage=round(match_percentage, 2),
            recommendations=recommendations
        )
    
    def _match_skills(
        self, 
        resume_skills: List[str], 
        job_skills: List[str]
    ) -> List[SkillMatch]:
        """Match resume skills against job skills"""
        matches = []
        
        for job_skill in job_skills:
            # Normalize job skill
            normalized_job_skill = normalize_skill(job_skill)
            
            # Try to match against resume skills
            matched, best_match, score = fuzzy_match_skill(
                normalized_job_skill,
                resume_skills,
                threshold=self.match_threshold
            )
            
            matches.append(SkillMatch(
                skill=job_skill,
                matched=matched,
                match_score=round(score, 2),
                matched_with=best_match if matched else None
            ))
        
        return matches
    
    def _generate_recommendations(
        self,
        missing_required: List[str],
        missing_preferred: List[str],
        match_percentage: float
    ) -> List[str]:
        """Generate recommendations based on skill gaps"""
        recommendations = []
        
        if match_percentage < 50:
            recommendations.append(
                "Your skill match is quite low. Consider acquiring the missing required skills before applying."
            )
        elif match_percentage < 75:
            recommendations.append(
                "You have some of the required skills. Focus on developing the missing required skills to improve your chances."
            )
        else:
            recommendations.append(
                "Great skill match! You meet most of the required skills."
            )
        
        # Prioritize missing required skills
        if missing_required:
            top_missing = missing_required[:3]
            recommendations.append(
                f"Priority skills to learn: {', '.join(top_missing)}"
            )
        
        # Suggest preferred skills
        if missing_preferred and match_percentage >= 70:
            top_preferred = missing_preferred[:2]
            recommendations.append(
                f"Consider learning these preferred skills to stand out: {', '.join(top_preferred)}"
            )
        
        return recommendations
