"""
Example API Client - Demonstrates how to use the Job Readiness API
"""
import requests
import json


class JobReadinessClient:
    """Client for interacting with the Job Readiness API"""
    
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
    
    def analyze_complete(self, resume_text: str, job_description: str) -> dict:
        """
        Get complete analysis including job readiness, ATS score, and skill gap
        
        Args:
            resume_text: Full text of the resume
            job_description: Full text of the job description
            
        Returns:
            Complete analysis results
        """
        response = requests.post(
            f"{self.base_url}/api/analyze",
            data={
                "resume_text": resume_text,
                "job_description": job_description
            }
        )
        response.raise_for_status()
        return response.json()
    
    def get_ats_score(self, resume_text: str, job_description: str) -> dict:
        """Get ATS score only"""
        response = requests.post(
            f"{self.base_url}/api/ats-score",
            data={
                "resume_text": resume_text,
                "job_description": job_description
            }
        )
        response.raise_for_status()
        return response.json()
    
    def get_skill_gap(self, resume_text: str, job_description: str) -> dict:
        """Get skill gap analysis only"""
        response = requests.post(
            f"{self.base_url}/api/skill-gap",
            data={
                "resume_text": resume_text,
                "job_description": job_description
            }
        )
        response.raise_for_status()
        return response.json()
    
    def get_job_readiness(self, resume_text: str, job_description: str) -> dict:
        """Get job readiness score only"""
        response = requests.post(
            f"{self.base_url}/api/job-readiness",
            data={
                "resume_text": resume_text,
                "job_description": job_description
            }
        )
        response.raise_for_status()
        return response.json()
    
    def parse_resume(self, resume_text: str) -> dict:
        """Parse resume and extract structured information"""
        response = requests.post(
            f"{self.base_url}/api/parse-resume",
            data={"resume_text": resume_text}
        )
        response.raise_for_status()
        return response.json()
    
    def parse_job_description(self, job_description: str) -> dict:
        """Parse job description and extract requirements"""
        response = requests.post(
            f"{self.base_url}/api/parse-job-description",
            data={"job_description": job_description}
        )
        response.raise_for_status()
        return response.json()


def example_usage():
    """Example usage of the client"""
    
    # Sample resume
    resume = """
    John Doe
    Software Engineer
    Email: john.doe@email.com | Phone: (555) 123-4567
    
    SKILLS
    Python, JavaScript, React, Node.js, Django, PostgreSQL, AWS, Docker
    
    EXPERIENCE
    Senior Software Engineer | TechCorp
    2020 - Present
    • Developed microservices handling 1M requests per day
    • Led team of 5 engineers
    • Technologies: Python, Django, React, AWS
    
    EDUCATION
    Bachelor of Science in Computer Science
    University of Technology, 2018
    """
    
    # Sample job description
    job_description = """
    Backend Software Engineer
    
    We are looking for an experienced backend engineer.
    
    Requirements:
    • 3+ years of software engineering experience
    • Strong Python skills
    • Experience with Django or Flask
    • Database experience (PostgreSQL, MongoDB)
    • Cloud experience (AWS preferred)
    • Bachelor's degree in Computer Science
    
    Responsibilities:
    • Build scalable APIs
    • Design microservices
    • Mentor junior developers
    """
    
    # Initialize client
    client = JobReadinessClient()
    
    try:
        print("🚀 Analyzing resume against job description...\n")
        
        # Get complete analysis
        result = client.analyze_complete(resume, job_description)
        
        # Display results
        print("=" * 80)
        print("ANALYSIS RESULTS")
        print("=" * 80)
        
        print("\n📊 JOB READINESS SCORE")
        print("-" * 80)
        readiness = result['job_readiness_score']
        print(f"Overall Score: {readiness['overall_score']:.1f}/100")
        print(f"  • Skills: {readiness['skill_score']:.1f}/100")
        print(f"  • Experience: {readiness['experience_score']:.1f}/100")
        print(f"  • Education: {readiness['education_score']:.1f}/100")
        print(f"  • Projects: {readiness['project_score']:.1f}/100")
        
        print("\n💪 Strengths:")
        for strength in readiness['strengths']:
            print(f"  • {strength}")
        
        if readiness['weaknesses']:
            print("\n⚠️  Areas for Improvement:")
            for weakness in readiness['weaknesses']:
                print(f"  • {weakness}")
        
        print("\n🤖 ATS SCORE")
        print("-" * 80)
        ats = result['ats_score']
        print(f"Overall Score: {ats['overall_score']:.1f}/100")
        print(f"  • Keyword Match: {ats['keyword_match_score']:.1f}/100")
        print(f"  • Formatting: {ats['formatting_score']:.1f}/100")
        print(f"  • Completeness: {ats['section_completeness_score']:.1f}/100")
        
        print("\n💡 Recommendations:")
        for rec in ats['recommendations'][:3]:
            print(f"  • {rec}")
        
        print("\n🎯 SKILL GAP ANALYSIS")
        print("-" * 80)
        skill_gap = result['skill_gap_analysis']
        print(f"Skill Match: {skill_gap['skill_match_percentage']:.1f}%")
        print(f"Matched Required Skills: {skill_gap['matched_required_count']}/{skill_gap['total_required_skills']}")
        
        if skill_gap['missing_required_skills']:
            print("\n❌ Missing Required Skills:")
            for skill in skill_gap['missing_required_skills'][:5]:
                print(f"  • {skill}")
        
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(result['summary'])
        print("=" * 80)
        
        # Save results to file
        with open('analysis_result.json', 'w') as f:
            json.dump(result, f, indent=2)
        print("\n✅ Results saved to 'analysis_result.json'")
        
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to API server.")
        print("Make sure the server is running: uvicorn main:app --reload")
    except requests.exceptions.HTTPError as e:
        print(f"❌ API Error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


def example_batch_analysis():
    """Example of analyzing multiple resumes against one job description"""
    
    client = JobReadinessClient()
    
    job_description = "Your job description here..."
    
    resumes = [
        ("candidate1.txt", "Resume text 1..."),
        ("candidate2.txt", "Resume text 2..."),
        ("candidate3.txt", "Resume text 3..."),
    ]
    
    results = []
    
    for filename, resume_text in resumes:
        try:
            result = client.analyze_complete(resume_text, job_description)
            results.append({
                'filename': filename,
                'overall_score': result['job_readiness_score']['overall_score'],
                'ats_score': result['ats_score']['overall_score'],
                'skill_match': result['skill_gap_analysis']['skill_match_percentage']
            })
        except Exception as e:
            print(f"Error analyzing {filename}: {e}")
    
    # Sort by overall score
    results.sort(key=lambda x: x['overall_score'], reverse=True)
    
    print("\n📊 BATCH ANALYSIS RESULTS (Ranked)")
    print("=" * 80)
    for i, result in enumerate(results, 1):
        print(f"{i}. {result['filename']}")
        print(f"   Overall: {result['overall_score']:.1f} | "
              f"ATS: {result['ats_score']:.1f} | "
              f"Skills: {result['skill_match']:.1f}%")
        print()


if __name__ == "__main__":
    # Run the example
    example_usage()
    
    # Uncomment to test batch analysis
    # example_batch_analysis()
