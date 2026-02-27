"""
Resume and Job Description parsers
"""
import re
from typing import List, Dict, Any, Optional
from models import (
    ParsedResume, ParsedJobDescription, 
    Education, Experience, Project
)
from utils import (
    clean_text, extract_email, extract_phone, 
    extract_urls, extract_entities, extract_noun_phrases,
    extract_years_of_experience, get_nlp
)


class ResumeParser:
    """Parse resumes and extract structured information"""
    
    # Common section headers
    SECTION_HEADERS = {
        'education': ['education', 'academic', 'qualification', 'degree'],
        'experience': ['experience', 'work history', 'employment', 'professional experience'],
        'skills': ['skills', 'technical skills', 'competencies', 'expertise', 'technologies'],
        'projects': ['projects', 'personal projects', 'key projects'],
        'certifications': ['certifications', 'certificates', 'licenses'],
        'summary': ['summary', 'profile', 'objective', 'about me', 'professional summary']
    }
    
    # Common skill keywords and technologies
    COMMON_SKILLS = [
        # Programming Languages
        'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'ruby', 'go', 'rust',
        'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl', 'shell', 'bash',
        
        # Web Technologies
        'html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django',
        'flask', 'fastapi', 'spring boot', 'asp.net', 'jquery', 'bootstrap', 'tailwind',
        
        # Databases
        'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'cassandra', 'oracle',
        'dynamodb', 'elasticsearch', 'sqlite', 'mariadb',
        
        # Cloud & DevOps
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab', 'github',
        'terraform', 'ansible', 'ci/cd', 'devops', 'linux', 'unix',
        
        # Data & ML
        'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn',
        'pandas', 'numpy', 'data analysis', 'data science', 'nlp', 'computer vision',
        'spark', 'hadoop', 'kafka', 'airflow',
        
        # Other
        'git', 'api', 'rest', 'graphql', 'microservices', 'agile', 'scrum',
        'testing', 'junit', 'pytest', 'selenium', 'jira', 'confluence'
    ]
    
    def __init__(self):
        self.nlp = get_nlp()
    
    def parse(self, text: str) -> ParsedResume:
        """Parse resume text and extract structured information"""
        cleaned_text = clean_text(text)
        
        # Extract contact information
        contact_info = self._extract_contact_info(text)
        
        # Split into sections
        sections = self._split_into_sections(cleaned_text)
        
        # Extract skills
        skills = self._extract_skills(sections.get('skills', '') + ' ' + cleaned_text)
        
        # Extract education
        education = self._extract_education(sections.get('education', ''))
        
        # Extract experience
        experience = self._extract_experience(sections.get('experience', ''))
        
        # Extract projects
        projects = self._extract_projects(sections.get('projects', ''))
        
        # Extract certifications
        certifications = self._extract_certifications(sections.get('certifications', ''))
        
        # Extract summary
        summary = sections.get('summary', None)
        
        return ParsedResume(
            raw_text=text,
            contact_info=contact_info,
            skills=list(set(skills)),  # Remove duplicates
            education=education,
            experience=experience,
            projects=projects,
            certifications=certifications,
            summary=summary
        )
    
    def _extract_contact_info(self, text: str) -> Dict[str, Any]:
        """Extract contact information"""
        return {
            'emails': extract_email(text),
            'phones': extract_phone(text),
            'urls': extract_urls(text)
        }
    
    def _split_into_sections(self, text: str) -> Dict[str, str]:
        """Split resume into sections based on headers"""
        sections = {}
        lines = text.split('\n')
        current_section = None
        current_content = []
        
        for line in lines:
            line_lower = line.lower().strip()
            
            # Check if line is a section header
            section_found = None
            for section_type, headers in self.SECTION_HEADERS.items():
                if any(header in line_lower for header in headers):
                    section_found = section_type
                    break
            
            if section_found:
                # Save previous section
                if current_section:
                    sections[current_section] = '\n'.join(current_content)
                
                # Start new section
                current_section = section_found
                current_content = []
            elif current_section:
                current_content.append(line)
        
        # Save last section
        if current_section:
            sections[current_section] = '\n'.join(current_content)
        
        return sections
    
    def _extract_skills(self, text: str) -> List[str]:
        """Extract technical skills"""
        skills = set()
        text_lower = text.lower()
        
        # Match against common skills
        for skill in self.COMMON_SKILLS:
            if skill in text_lower:
                skills.add(skill.title() if len(skill) > 3 else skill.upper())
        
        # Extract from bullet points and comma-separated lists
        # Look for patterns like "• Python" or "- Java" or "Python, Java, C++"
        bullet_pattern = r'[•\-\*]\s*([A-Za-z][A-Za-z0-9\+\#\.\s]{2,30}?)(?:\n|,|;|$)'
        matches = re.findall(bullet_pattern, text)
        skills.update([m.strip() for m in matches if len(m.strip()) > 2])
        
        # Extract noun phrases that might be skills
        noun_phrases = extract_noun_phrases(text)
        for phrase in noun_phrases:
            phrase_lower = phrase.lower()
            # Filter for likely technical terms (short, contains specific keywords)
            if 2 < len(phrase.split()) <= 4:
                if any(tech in phrase_lower for tech in ['software', 'data', 'web', 'cloud', 'machine', 'learning']):
                    skills.add(phrase)
        
        return list(skills)
    
    def _extract_education(self, text: str) -> List[Education]:
        """Extract education information"""
        if not text:
            return []
        
        education_list = []
        
        # Degree patterns
        degree_patterns = [
            r"(Bachelor|Master|PhD|Ph\.D|B\.S\.|M\.S\.|B\.A\.|M\.A\.|B\.Tech|M\.Tech|MBA)\.?\s+(?:of\s+)?(?:Science\s+)?(?:in\s+)?([A-Za-z\s]+)",
            r"(Associate|Diploma)\s+(?:in\s+)?([A-Za-z\s]+)"
        ]
        
        for pattern in degree_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                degree = match[0]
                field = match[1].strip() if len(match) > 1 else None
                
                # Try to find institution near the degree
                lines = text.split('\n')
                for i, line in enumerate(lines):
                    if degree.lower() in line.lower():
                        # Look at next few lines for institution
                        institution = "Unknown"
                        for j in range(i+1, min(i+4, len(lines))):
                            if lines[j].strip() and not any(d in lines[j].lower() for d in ['bachelor', 'master', 'phd']):
                                institution = lines[j].strip()
                                break
                        
                        education_list.append(Education(
                            degree=degree,
                            field=field,
                            institution=institution
                        ))
                        break
        
        return education_list
    
    def _extract_experience(self, text: str) -> List[Experience]:
        """Extract work experience"""
        if not text:
            return []
        
        experiences = []
        
        # Split by common separators (multiple blank lines, or specific patterns)
        entries = re.split(r'\n\s*\n', text)
        
        for entry in entries:
            if len(entry.strip()) < 20:  # Too short to be meaningful
                continue
            
            lines = [l.strip() for l in entry.split('\n') if l.strip()]
            if not lines:
                continue
            
            # First line often contains title and company
            title_line = lines[0]
            
            # Extract title and company
            title = "Unknown"
            company = "Unknown"
            
            # Pattern: "Software Engineer at Google"
            if ' at ' in title_line:
                parts = title_line.split(' at ')
                title = parts[0].strip()
                company = parts[1].strip()
            # Pattern: "Software Engineer | Google"
            elif '|' in title_line:
                parts = title_line.split('|')
                title = parts[0].strip()
                company = parts[1].strip() if len(parts) > 1 else "Unknown"
            else:
                title = title_line
                # Try to find company in next line
                if len(lines) > 1:
                    company = lines[1]
            
            # Combine remaining lines as description
            description = '\n'.join(lines[1:]) if len(lines) > 1 else entry
            
            # Extract skills used from description
            skills_used = self._extract_skills(description)
            
            experiences.append(Experience(
                title=title,
                company=company,
                description=description,
                skills_used=skills_used
            ))
        
        return experiences
    
    def _extract_projects(self, text: str) -> List[Project]:
        """Extract project information"""
        if not text:
            return []
        
        projects = []
        entries = re.split(r'\n\s*\n', text)
        
        for entry in entries:
            if len(entry.strip()) < 20:
                continue
            
            lines = [l.strip() for l in entry.split('\n') if l.strip()]
            if not lines:
                continue
            
            # First line is usually project name
            name = lines[0]
            description = '\n'.join(lines[1:]) if len(lines) > 1 else entry
            
            # Extract technologies
            technologies = self._extract_skills(description)
            
            # Extract URLs
            urls = extract_urls(entry)
            url = urls[0] if urls else None
            
            projects.append(Project(
                name=name,
                description=description,
                technologies=technologies,
                url=url
            ))
        
        return projects
    
    def _extract_certifications(self, text: str) -> List[str]:
        """Extract certifications"""
        if not text:
            return []
        
        certifications = []
        
        # Split by bullet points or lines
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            # Remove bullet points
            line = re.sub(r'^[•\-\*]\s*', '', line)
            if len(line) > 5:
                certifications.append(line)
        
        return certifications


class JobDescriptionParser:
    """Parse job descriptions and extract requirements"""
    
    def __init__(self):
        self.nlp = get_nlp()
    
    def parse(self, text: str) -> ParsedJobDescription:
        """Parse job description and extract structured information"""
        cleaned_text = clean_text(text)
        
        # Extract job title
        job_title = self._extract_job_title(cleaned_text)
        
        # Extract company name
        company = self._extract_company(cleaned_text)
        
        # Extract required and preferred skills
        required_skills, preferred_skills = self._extract_skills(cleaned_text)
        
        # Extract experience requirements
        experience_years = self._extract_experience_requirements(cleaned_text)
        
        # Extract education requirements
        education = self._extract_education_requirements(cleaned_text)
        
        # Extract responsibilities
        responsibilities = self._extract_responsibilities(cleaned_text)
        
        # Extract qualifications
        qualifications = self._extract_qualifications(cleaned_text)
        
        return ParsedJobDescription(
            raw_text=text,
            job_title=job_title,
            company=company,
            required_skills=required_skills,
            preferred_skills=preferred_skills,
            required_experience_years=experience_years,
            required_education=education,
            responsibilities=responsibilities,
            qualifications=qualifications
        )
    
    def _extract_job_title(self, text: str) -> str:
        """Extract job title from JD"""
        # Usually in first few lines
        lines = text.split('\n')[:5]
        
        # Look for common job title patterns
        for line in lines:
            line = line.strip()
            # Skip very short lines
            if len(line) < 5:
                continue
            # Job titles often contain these keywords
            if any(word in line.lower() for word in ['engineer', 'developer', 'analyst', 'manager', 'designer', 'scientist']):
                return line
        
        # Default to first substantial line
        for line in lines:
            if len(line.strip()) > 5:
                return line.strip()
        
        return "Unknown Position"
    
    def _extract_company(self, text: str) -> Optional[str]:
        """Extract company name"""
        entities = extract_entities(text[:500])  # Check first 500 chars
        if entities['ORG']:
            return entities['ORG'][0]
        return None
    
    def _extract_skills(self, text: str) -> tuple[List[str], List[str]]:
        """Extract required and preferred skills"""
        required_skills = []
        preferred_skills = []
        
        text_lower = text.lower()
        
        # Split into sections
        sections = self._split_into_sections(text)
        
        # Get skills from requirements section
        requirements_text = sections.get('requirements', '') + sections.get('qualifications', '')
        preferred_text = sections.get('preferred', '') + sections.get('nice to have', '')
        
        # Use resume parser's skill extraction
        parser = ResumeParser()
        required_skills = parser._extract_skills(requirements_text + text[:1000])
        preferred_skills = parser._extract_skills(preferred_text)
        
        return required_skills, preferred_skills
    
    def _extract_experience_requirements(self, text: str) -> Optional[int]:
        """Extract required years of experience"""
        years = extract_years_of_experience(text)
        return min(years) if years else None
    
    def _extract_education_requirements(self, text: str) -> List[str]:
        """Extract education requirements"""
        education = []
        
        degree_patterns = [
            r"(Bachelor['']s?|Master['']s?|PhD|Ph\.D|B\.S\.|M\.S\.|B\.A\.|M\.A\.)",
        ]
        
        for pattern in degree_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            education.extend(matches)
        
        return list(set(education))
    
    def _extract_responsibilities(self, text: str) -> List[str]:
        """Extract job responsibilities"""
        sections = self._split_into_sections(text)
        resp_text = sections.get('responsibilities', '')
        
        if not resp_text:
            return []
        
        # Extract bullet points
        responsibilities = []
        lines = resp_text.split('\n')
        
        for line in lines:
            line = line.strip()
            # Remove bullet points
            line = re.sub(r'^[•\-\*\d\.]\s*', '', line)
            if len(line) > 10:
                responsibilities.append(line)
        
        return responsibilities
    
    def _extract_qualifications(self, text: str) -> List[str]:
        """Extract qualifications"""
        sections = self._split_into_sections(text)
        qual_text = sections.get('qualifications', '') + sections.get('requirements', '')
        
        if not qual_text:
            return []
        
        qualifications = []
        lines = qual_text.split('\n')
        
        for line in lines:
            line = line.strip()
            # Remove bullet points
            line = re.sub(r'^[•\-\*\d\.]\s*', '', line)
            if len(line) > 10:
                qualifications.append(line)
        
        return qualifications
    
    def _split_into_sections(self, text: str) -> Dict[str, str]:
        """Split JD into sections"""
        sections = {}
        
        section_headers = {
            'responsibilities': ['responsibilities', 'duties', 'what you will do', 'what you\'ll do'],
            'requirements': ['requirements', 'required', 'must have', 'minimum qualifications'],
            'qualifications': ['qualifications', 'required qualifications'],
            'preferred': ['preferred', 'nice to have', 'bonus', 'plus', 'preferred qualifications'],
            'about': ['about us', 'about the company', 'company overview']
        }
        
        lines = text.split('\n')
        current_section = None
        current_content = []
        
        for line in lines:
            line_lower = line.lower().strip()
            
            # Check if line is a section header
            section_found = None
            for section_type, headers in section_headers.items():
                if any(header in line_lower for header in headers):
                    section_found = section_type
                    break
            
            if section_found:
                # Save previous section
                if current_section:
                    sections[current_section] = '\n'.join(current_content)
                
                # Start new section
                current_section = section_found
                current_content = []
            elif current_section:
                current_content.append(line)
        
        # Save last section
        if current_section:
            sections[current_section] = '\n'.join(current_content)
        
        return sections
