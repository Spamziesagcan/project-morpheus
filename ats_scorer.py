"""
ATS (Applicant Tracking System) Scorer
Evaluates how well a resume would perform in ATS systems
"""
from typing import Dict, Any
from models import ParsedResume, ParsedJobDescription, ATSScore
from utils import (
    calculate_keyword_density, 
    extract_keywords_tfidf,
    tokenize_and_clean
)


class ATSScorer:
    """Score resume for ATS compatibility"""
    
    # Weights for different scoring components
    WEIGHTS = {
        'keyword_match': 0.50,
        'formatting': 0.25,
        'section_completeness': 0.25
    }
    
    def __init__(self):
        pass
    
    def score(
        self,
        resume: ParsedResume,
        job_desc: ParsedJobDescription
    ) -> ATSScore:
        """
        Calculate ATS score
        
        Args:
            resume: Parsed resume
            job_desc: Parsed job description
            
        Returns:
            ATSScore with detailed breakdown
        """
        # Calculate individual scores
        keyword_score = self._calculate_keyword_score(resume, job_desc)
        formatting_score = self._calculate_formatting_score(resume)
        section_score = self._calculate_section_completeness_score(resume)
        
        # Calculate overall score (weighted average)
        overall_score = (
            keyword_score * self.WEIGHTS['keyword_match'] +
            formatting_score * self.WEIGHTS['formatting'] +
            section_score * self.WEIGHTS['section_completeness']
        )
        
        # Generate details
        details = {
            'keyword_details': self._get_keyword_details(resume, job_desc),
            'formatting_details': self._get_formatting_details(resume),
            'section_details': self._get_section_details(resume)
        }
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            keyword_score,
            formatting_score,
            section_score,
            details
        )
        
        return ATSScore(
            overall_score=round(overall_score, 2),
            keyword_match_score=round(keyword_score, 2),
            formatting_score=round(formatting_score, 2),
            section_completeness_score=round(section_score, 2),
            details=details,
            recommendations=recommendations
        )
    
    def _calculate_keyword_score(
        self,
        resume: ParsedResume,
        job_desc: ParsedJobDescription
    ) -> float:
        """Calculate keyword match score (0-100)"""
        # Extract important keywords from job description
        jd_keywords = extract_keywords_tfidf(job_desc.raw_text, top_n=30)
        
        if not jd_keywords:
            return 50.0  # Neutral score if no keywords
        
        # Get just the keyword strings
        keyword_list = [kw[0] for kw in jd_keywords]
        
        # Calculate keyword density in resume
        density = calculate_keyword_density(keyword_list, resume.raw_text)
        
        # Also check for skill matches
        required_skills_in_resume = sum(
            1 for skill in job_desc.required_skills
            if skill.lower() in resume.raw_text.lower()
        )
        
        skill_match_rate = 0
        if job_desc.required_skills:
            skill_match_rate = (required_skills_in_resume / len(job_desc.required_skills)) * 100
        
        # Combine keyword density and skill match (weighted)
        keyword_score = (density * 0.6) + (skill_match_rate * 0.4)
        
        return min(keyword_score, 100.0)
    
    def _calculate_formatting_score(self, resume: ParsedResume) -> float:
        """Calculate formatting score based on structure (0-100)"""
        score = 100.0
        issues = []
        
        # Check for excessive special characters (might indicate poor formatting)
        special_char_ratio = len([c for c in resume.raw_text if not c.isalnum() and not c.isspace()]) / len(resume.raw_text)
        if special_char_ratio > 0.15:
            score -= 15
            issues.append("High special character count detected")
        
        # Check for reasonable text length
        text_length = len(resume.raw_text)
        if text_length < 500:
            score -= 20
            issues.append("Resume too short")
        elif text_length > 10000:
            score -= 10
            issues.append("Resume too long")
        
        # Check for contact information
        if not resume.contact_info.get('emails'):
            score -= 10
            issues.append("No email found")
        
        # Check for reasonable line length (indicates good formatting)
        lines = resume.raw_text.split('\n')
        avg_line_length = sum(len(line) for line in lines) / len(lines) if lines else 0
        if avg_line_length > 150:
            score -= 10
            issues.append("Lines too long - may indicate formatting issues")
        
        return max(score, 0.0)
    
    def _calculate_section_completeness_score(self, resume: ParsedResume) -> float:
        """Calculate score based on presence of key sections (0-100)"""
        score = 0.0
        max_score = 100.0
        
        # Key sections and their weights
        sections = {
            'contact_info': 10,
            'skills': 30,
            'experience': 30,
            'education': 20,
            'projects': 5,
            'certifications': 5
        }
        
        # Check contact info
        if resume.contact_info.get('emails'):
            score += sections['contact_info']
        
        # Check skills
        if len(resume.skills) >= 3:
            score += sections['skills']
        elif len(resume.skills) > 0:
            score += sections['skills'] * 0.5
        
        # Check experience
        if len(resume.experience) >= 2:
            score += sections['experience']
        elif len(resume.experience) > 0:
            score += sections['experience'] * 0.6
        
        # Check education
        if len(resume.education) >= 1:
            score += sections['education']
        
        # Check projects
        if len(resume.projects) >= 1:
            score += sections['projects']
        
        # Check certifications
        if len(resume.certifications) >= 1:
            score += sections['certifications']
        
        return score
    
    def _get_keyword_details(
        self,
        resume: ParsedResume,
        job_desc: ParsedJobDescription
    ) -> Dict[str, Any]:
        """Get detailed keyword analysis"""
        jd_keywords = extract_keywords_tfidf(job_desc.raw_text, top_n=20)
        
        matched_keywords = []
        missing_keywords = []
        
        resume_text_lower = resume.raw_text.lower()
        
        for keyword, importance in jd_keywords:
            if keyword.lower() in resume_text_lower:
                matched_keywords.append({
                    'keyword': keyword,
                    'importance': round(importance, 3)
                })
            else:
                missing_keywords.append({
                    'keyword': keyword,
                    'importance': round(importance, 3)
                })
        
        return {
            'matched_keywords': matched_keywords,
            'missing_keywords': missing_keywords[:10],  # Top 10 missing
            'match_rate': len(matched_keywords) / len(jd_keywords) * 100 if jd_keywords else 0
        }
    
    def _get_formatting_details(self, resume: ParsedResume) -> Dict[str, Any]:
        """Get formatting details"""
        return {
            'text_length': len(resume.raw_text),
            'has_email': bool(resume.contact_info.get('emails')),
            'has_phone': bool(resume.contact_info.get('phones')),
            'line_count': len(resume.raw_text.split('\n'))
        }
    
    def _get_section_details(self, resume: ParsedResume) -> Dict[str, Any]:
        """Get section presence details"""
        return {
            'has_skills': len(resume.skills) > 0,
            'skill_count': len(resume.skills),
            'has_experience': len(resume.experience) > 0,
            'experience_count': len(resume.experience),
            'has_education': len(resume.education) > 0,
            'education_count': len(resume.education),
            'has_projects': len(resume.projects) > 0,
            'project_count': len(resume.projects),
            'has_certifications': len(resume.certifications) > 0,
            'certification_count': len(resume.certifications)
        }
    
    def _generate_recommendations(
        self,
        keyword_score: float,
        formatting_score: float,
        section_score: float,
        details: Dict[str, Any]
    ) -> list[str]:
        """Generate ATS improvement recommendations"""
        recommendations = []
        
        # Keyword recommendations
        if keyword_score < 60:
            recommendations.append(
                "Include more relevant keywords from the job description in your resume"
            )
            missing_kw = details['keyword_details']['missing_keywords'][:3]
            if missing_kw:
                keywords = [kw['keyword'] for kw in missing_kw]
                recommendations.append(
                    f"Consider adding these important keywords: {', '.join(keywords)}"
                )
        
        # Formatting recommendations
        if formatting_score < 80:
            if not details['formatting_details']['has_email']:
                recommendations.append("Add a clear email address to your resume")
            if details['formatting_details']['text_length'] < 500:
                recommendations.append("Your resume is too short. Add more details about your experience")
            elif details['formatting_details']['text_length'] > 10000:
                recommendations.append("Your resume is too long. Keep it concise and relevant")
        
        # Section recommendations
        if section_score < 70:
            section_det = details['section_details']
            if not section_det['has_skills'] or section_det['skill_count'] < 3:
                recommendations.append("Add a dedicated Skills section with at least 5-10 relevant skills")
            if not section_det['has_experience']:
                recommendations.append("Add your work experience with specific accomplishments")
            if not section_det['has_education']:
                recommendations.append("Include your educational background")
        
        # Overall good score
        if keyword_score >= 70 and formatting_score >= 80 and section_score >= 80:
            recommendations.append(
                "Your resume is well-optimized for ATS systems! Keep it updated with relevant keywords."
            )
        
        return recommendations
