"""
Job Readiness Scorer
Comprehensive scoring of candidate readiness for a specific job
"""
from typing import Dict, Any, List
from models import (
    ParsedResume, ParsedJobDescription, 
    JobReadinessScore, SkillGapAnalysis
)
from utils import calculate_cosine_similarity


class JobReadinessScorer:
    """Calculate overall job readiness score"""
    
    # Weights for different components
    WEIGHTS = {
        'skills': 0.40,
        'experience': 0.30,
        'education': 0.10,
        'projects': 0.20
    }
    
    def __init__(self):
        pass
    
    def score(
        self,
        resume: ParsedResume,
        job_desc: ParsedJobDescription,
        skill_gap: SkillGapAnalysis
    ) -> JobReadinessScore:
        """
        Calculate job readiness score
        
        Args:
            resume: Parsed resume
            job_desc: Parsed job description
            skill_gap: Skill gap analysis result
            
        Returns:
            JobReadinessScore with detailed breakdown
        """
        # Calculate individual component scores
        skill_score = self._calculate_skill_score(skill_gap)
        experience_score = self._calculate_experience_score(resume, job_desc)
        education_score = self._calculate_education_score(resume, job_desc)
        project_score = self._calculate_project_score(resume, job_desc)
        
        # Calculate overall score (weighted average)
        overall_score = (
            skill_score * self.WEIGHTS['skills'] +
            experience_score * self.WEIGHTS['experience'] +
            education_score * self.WEIGHTS['education'] +
            project_score * self.WEIGHTS['projects']
        )
        
        # Generate detailed breakdown
        breakdown = {
            'skill_details': self._get_skill_details(skill_gap),
            'experience_details': self._get_experience_details(resume, job_desc),
            'education_details': self._get_education_details(resume, job_desc),
            'project_details': self._get_project_details(resume, job_desc)
        }
        
        # Identify strengths and weaknesses
        strengths, weaknesses = self._identify_strengths_weaknesses(
            skill_score, experience_score, education_score, project_score
        )
        
        return JobReadinessScore(
            overall_score=round(overall_score, 2),
            skill_score=round(skill_score, 2),
            experience_score=round(experience_score, 2),
            education_score=round(education_score, 2),
            project_score=round(project_score, 2),
            breakdown=breakdown,
            strengths=strengths,
            weaknesses=weaknesses
        )
    
    def _calculate_skill_score(self, skill_gap: SkillGapAnalysis) -> float:
        """Calculate skill match score (0-100)"""
        # Base score on skill match percentage
        base_score = skill_gap.skill_match_percentage
        
        # Bonus for having extra skills
        if skill_gap.matched_required_count > skill_gap.total_required_skills:
            base_score = min(base_score + 5, 100)
        
        return base_score
    
    def _calculate_experience_score(
        self,
        resume: ParsedResume,
        job_desc: ParsedJobDescription
    ) -> float:
        """Calculate experience relevance score (0-100)"""
        score = 0.0
        
        # Check if has any experience
        if not resume.experience:
            return 0.0
        
        # Base score for having experience
        score = 40.0
        
        # Check experience level match
        if job_desc.required_experience_years:
            # Count total experience (assuming each role is at least 1 year if no dates)
            total_experience = len(resume.experience)  # Simplified - should parse dates
            
            if total_experience >= job_desc.required_experience_years:
                score += 30.0
            else:
                # Partial credit
                score += 30.0 * (total_experience / job_desc.required_experience_years)
        else:
            # No specific requirement, give full credit if they have experience
            score += 30.0
        
        # Check relevance of experience through semantic similarity
        experience_texts = ' '.join([exp.description for exp in resume.experience])
        jd_responsibilities = ' '.join(job_desc.responsibilities + job_desc.qualifications)
        
        if experience_texts and jd_responsibilities:
            relevance = calculate_cosine_similarity(experience_texts, jd_responsibilities)
            score += relevance * 30  # Up to 30 points for relevance
        
        return min(score, 100.0)
    
    def _calculate_education_score(
        self,
        resume: ParsedResume,
        job_desc: ParsedJobDescription
    ) -> float:
        """Calculate education match score (0-100)"""
        score = 0.0
        
        # Check if has any education
        if not resume.education:
            if not job_desc.required_education:
                return 70.0  # No education required, not a problem
            return 20.0  # Has requirement but no education listed
        
        # Base score for having education
        score = 60.0
        
        # Check if meets education requirements
        if job_desc.required_education:
            resume_degrees = [edu.degree.lower() for edu in resume.education]
            
            for req_edu in job_desc.required_education:
                req_edu_lower = req_edu.lower()
                
                # Check for degree match
                matched = False
                for degree in resume_degrees:
                    if (req_edu_lower in degree or 
                        degree in req_edu_lower or
                        self._is_education_equivalent(req_edu_lower, degree)):
                        matched = True
                        break
                
                if matched:
                    score += 40.0
                    break
            
            # Check field relevance
            jd_text = job_desc.raw_text.lower()
            for edu in resume.education:
                if edu.field:
                    field_lower = edu.field.lower()
                    if field_lower in jd_text or any(word in jd_text for word in field_lower.split()):
                        score = min(score + 10, 100)
        else:
            # No specific requirement
            score = 90.0
        
        return min(score, 100.0)
    
    def _calculate_project_score(
        self,
        resume: ParsedResume,
        job_desc: ParsedJobDescription
    ) -> float:
        """Calculate project relevance score (0-100)"""
        if not resume.projects:
            return 30.0  # Projects are nice to have but not critical
        
        score = 50.0  # Base score for having projects
        
        # Check relevance of projects
        project_texts = ' '.join([
            f"{proj.name} {proj.description}" for proj in resume.projects
        ])
        
        jd_text = f"{' '.join(job_desc.responsibilities)} {' '.join(job_desc.qualifications)}"
        
        if project_texts and jd_text:
            relevance = calculate_cosine_similarity(project_texts, jd_text)
            score += relevance * 50  # Up to 50 points for relevance
        
        # Bonus for multiple projects
        if len(resume.projects) >= 3:
            score = min(score + 10, 100)
        
        return min(score, 100.0)
    
    def _is_education_equivalent(self, req_edu: str, candidate_edu: str) -> bool:
        """Check if education levels are equivalent or candidate exceeds requirement"""
        hierarchy = ['associate', 'bachelor', 'master', 'phd', 'doctorate']
        
        req_level = -1
        candidate_level = -1
        
        for i, level in enumerate(hierarchy):
            if level in req_edu:
                req_level = i
            if level in candidate_edu:
                candidate_level = i
        
        # Candidate meets or exceeds requirement
        return candidate_level >= req_level if req_level != -1 and candidate_level != -1 else False
    
    def _get_skill_details(self, skill_gap: SkillGapAnalysis) -> Dict[str, Any]:
        """Get detailed skill analysis"""
        return {
            'total_required': skill_gap.total_required_skills,
            'matched': skill_gap.matched_required_count,
            'match_percentage': skill_gap.skill_match_percentage,
            'missing_count': len(skill_gap.missing_required_skills),
            'has_preferred_skills': len([
                s for s in skill_gap.matched_skills 
                if s.matched and s.skill not in skill_gap.missing_required_skills
            ])
        }
    
    def _get_experience_details(
        self,
        resume: ParsedResume,
        job_desc: ParsedJobDescription
    ) -> Dict[str, Any]:
        """Get detailed experience analysis"""
        return {
            'experience_count': len(resume.experience),
            'required_years': job_desc.required_experience_years,
            'has_experience': len(resume.experience) > 0,
            'recent_roles': [exp.title for exp in resume.experience[:3]]
        }
    
    def _get_education_details(
        self,
        resume: ParsedResume,
        job_desc: ParsedJobDescription
    ) -> Dict[str, Any]:
        """Get detailed education analysis"""
        return {
            'education_count': len(resume.education),
            'degrees': [edu.degree for edu in resume.education],
            'fields': [edu.field for edu in resume.education if edu.field],
            'required_education': job_desc.required_education,
            'has_education': len(resume.education) > 0
        }
    
    def _get_project_details(
        self,
        resume: ParsedResume,
        job_desc: ParsedJobDescription
    ) -> Dict[str, Any]:
        """Get detailed project analysis"""
        return {
            'project_count': len(resume.projects),
            'project_names': [proj.name for proj in resume.projects],
            'technologies_used': list(set([
                tech for proj in resume.projects 
                for tech in proj.technologies
            ]))
        }
    
    def _identify_strengths_weaknesses(
        self,
        skill_score: float,
        experience_score: float,
        education_score: float,
        project_score: float
    ) -> tuple[List[str], List[str]]:
        """Identify candidate strengths and weaknesses"""
        strengths = []
        weaknesses = []
        
        # Analyze skills
        if skill_score >= 80:
            strengths.append("Excellent skill match with job requirements")
        elif skill_score >= 60:
            strengths.append("Good foundational skills for this role")
        elif skill_score < 50:
            weaknesses.append("Significant skill gaps compared to job requirements")
        
        # Analyze experience
        if experience_score >= 80:
            strengths.append("Strong relevant work experience")
        elif experience_score >= 60:
            strengths.append("Decent professional background")
        elif experience_score < 50:
            weaknesses.append("Limited relevant work experience")
        
        # Analyze education
        if education_score >= 85:
            strengths.append("Educational background aligns well with requirements")
        elif education_score < 50:
            weaknesses.append("Educational qualifications may not meet requirements")
        
        # Analyze projects
        if project_score >= 75:
            strengths.append("Impressive relevant projects demonstrate practical skills")
        elif project_score < 40:
            weaknesses.append("Few or no relevant projects showcased")
        
        # Overall assessment
        avg_score = (skill_score + experience_score + education_score + project_score) / 4
        if avg_score >= 75:
            strengths.append("Overall strong candidate for this position")
        elif avg_score < 50:
            weaknesses.append("May need significant development to meet job requirements")
        
        return strengths, weaknesses
