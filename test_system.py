"""
Test script to demonstrate the job readiness scoring system
"""
import asyncio
import json
from main import (
    resume_parser, jd_parser, skill_gap_analyzer,
    ats_scorer, readiness_scorer, _generate_summary
)


# Sample Resume
SAMPLE_RESUME = """
John Doe
Software Engineer
Email: john.doe@email.com | Phone: (555) 123-4567
LinkedIn: linkedin.com/in/johndoe | GitHub: github.com/johndoe

PROFESSIONAL SUMMARY
Experienced Full-Stack Software Engineer with 5+ years of expertise in building scalable web applications. 
Proficient in Python, JavaScript, and cloud technologies. Strong background in machine learning and data engineering.

TECHNICAL SKILLS
• Programming Languages: Python, JavaScript, TypeScript, Java, SQL
• Web Technologies: React, Node.js, Express, Django, FastAPI, HTML, CSS
• Databases: PostgreSQL, MongoDB, Redis, MySQL
• Cloud & DevOps: AWS, Docker, Kubernetes, Jenkins, CI/CD
• Data & ML: TensorFlow, PyTorch, Pandas, NumPy, Scikit-learn
• Tools: Git, Jira, Agile, REST APIs, GraphQL

PROFESSIONAL EXPERIENCE

Senior Software Engineer | TechCorp Inc.
January 2021 - Present
• Led development of microservices architecture serving 1M+ users, improving system scalability by 300%
• Implemented machine learning models for recommendation system, increasing user engagement by 45%
• Architected CI/CD pipeline reducing deployment time from 2 hours to 15 minutes
• Mentored team of 5 junior engineers in best practices and code reviews
• Technologies: Python, Django, React, PostgreSQL, AWS, Docker, Kubernetes

Software Engineer | StartupXYZ
June 2019 - December 2020
• Developed RESTful APIs handling 100K+ requests per day
• Built responsive web applications using React and Node.js
• Integrated payment systems and third-party APIs
• Implemented automated testing increasing code coverage to 85%
• Technologies: JavaScript, Node.js, Express, MongoDB, React, Jest

Junior Developer | WebSolutions Ltd.
January 2018 - May 2019
• Created dynamic web applications for various clients
• Collaborated with designers to implement pixel-perfect UI components
• Fixed bugs and improved application performance
• Technologies: JavaScript, HTML, CSS, jQuery, MySQL

EDUCATION

Bachelor of Science in Computer Science
University of Technology | 2014 - 2018
GPA: 3.8/4.0

PROJECTS

• E-commerce Platform: Built full-stack e-commerce application with payment integration
  Technologies: Python, Django, React, PostgreSQL, Stripe API
  
• ML Image Classifier: Developed CNN-based image classification system with 95% accuracy
  Technologies: Python, TensorFlow, Keras, OpenCV

• Real-time Chat Application: Created WebSocket-based chat app with user authentication
  Technologies: Node.js, Socket.io, React, MongoDB

CERTIFICATIONS
• AWS Certified Solutions Architect
• MongoDB Certified Developer
• Google Cloud Professional Data Engineer
"""


# Sample Job Description
SAMPLE_JOB_DESCRIPTION = """
Senior Software Engineer - Backend

TechCorp Inc.
Location: San Francisco, CA (Remote)

About the Role:
We are seeking a talented Senior Software Engineer to join our backend team. You will be responsible for 
designing and implementing scalable microservices, optimizing database performance, and mentoring junior engineers.

Responsibilities:
• Design and develop robust, scalable backend services and APIs
• Build microservices architecture using modern frameworks
• Optimize database queries and improve system performance
• Implement automated testing and CI/CD pipelines
• Collaborate with cross-functional teams including frontend, product, and design
• Mentor junior engineers and conduct code reviews
• Participate in architectural decisions and technical planning

Required Qualifications:
• 5+ years of experience in software engineering
• Strong proficiency in Python and/or Java
• Experience with Django, Flask, or FastAPI
• Proficiency in SQL and NoSQL databases (PostgreSQL, MongoDB)
• Experience with cloud platforms (AWS, GCP, or Azure)
• Strong understanding of microservices architecture
• Experience with containerization (Docker, Kubernetes)
• Knowledge of CI/CD pipelines and DevOps practices
• Bachelor's degree in Computer Science or related field

Preferred Qualifications:
• Experience with machine learning or data engineering
• Knowledge of GraphQL
• Experience with message queues (Kafka, RabbitMQ)
• Contributions to open-source projects
• Master's degree in Computer Science

Technical Skills Required:
• Python, Java, or Go
• Django, Flask, or Spring Boot
• PostgreSQL, MySQL, or MongoDB
• AWS, GCP, or Azure
• Docker, Kubernetes
• Git, Jenkins, CI/CD
• REST APIs, Microservices
• Agile/Scrum methodologies
"""


# Alternative test cases
JUNIOR_RESUME = """
Jane Smith
Junior Developer
Email: jane.smith@email.com

EDUCATION
Bachelor of Science in Computer Science
State University | 2020 - 2024
GPA: 3.5/4.0

SKILLS
• Programming: Python, JavaScript, HTML, CSS
• Technologies: React, Git
• Databases: MySQL

PROJECTS
• Todo List App: Built a simple todo application using React
• Personal Website: Created portfolio website with HTML/CSS/JavaScript

INTERNSHIP
Software Engineering Intern | Small Startup
Summer 2023
• Helped fix bugs in existing web application
• Learned about Agile development process
"""


SENIOR_JOB = """
Lead Software Architect

Requirements:
• 10+ years of software engineering experience
• 5+ years in leadership roles
• Expert-level proficiency in multiple programming languages
• Deep understanding of distributed systems
• Experience with large-scale system design
• Master's degree or PhD preferred
• Strong cloud architecture experience (AWS/Azure/GCP)
• Experience with Kubernetes at scale
"""


async def test_analysis():
    """Test the complete analysis pipeline"""
    
    print("=" * 80)
    print("JOB READINESS SCORING SYSTEM - TEST")
    print("=" * 80)
    print()
    
    # Test Case 1: Good Match
    print("Test Case 1: Experienced Candidate vs Senior Role")
    print("-" * 80)
    
    parsed_resume = resume_parser.parse(SAMPLE_RESUME)
    parsed_jd = jd_parser.parse(SAMPLE_JOB_DESCRIPTION)
    
    print(f"\n📄 Resume Parsed:")
    print(f"  • Skills Found: {len(parsed_resume.skills)}")
    print(f"  • Experience Entries: {len(parsed_resume.experience)}")
    print(f"  • Education: {len(parsed_resume.education)}")
    print(f"  • Projects: {len(parsed_resume.projects)}")
    
    print(f"\n📋 Job Description Parsed:")
    print(f"  • Job Title: {parsed_jd.job_title}")
    print(f"  • Required Skills: {len(parsed_jd.required_skills)}")
    print(f"  • Preferred Skills: {len(parsed_jd.preferred_skills)}")
    print(f"  • Required Experience: {parsed_jd.required_experience_years} years")
    
    # Skill Gap Analysis
    skill_gap = skill_gap_analyzer.analyze(parsed_resume, parsed_jd)
    print(f"\n🎯 Skill Gap Analysis:")
    print(f"  • Skill Match: {skill_gap.skill_match_percentage:.1f}%")
    print(f"  • Matched Required Skills: {skill_gap.matched_required_count}/{skill_gap.total_required_skills}")
    print(f"  • Missing Required Skills: {len(skill_gap.missing_required_skills)}")
    if skill_gap.missing_required_skills:
        print(f"    - {', '.join(skill_gap.missing_required_skills[:5])}")
    
    # ATS Score
    ats_score = ats_scorer.score(parsed_resume, parsed_jd)
    print(f"\n🤖 ATS Score:")
    print(f"  • Overall: {ats_score.overall_score:.1f}/100")
    print(f"  • Keyword Match: {ats_score.keyword_match_score:.1f}/100")
    print(f"  • Formatting: {ats_score.formatting_score:.1f}/100")
    print(f"  • Section Completeness: {ats_score.section_completeness_score:.1f}/100")
    
    # Job Readiness Score
    readiness_score = readiness_scorer.score(parsed_resume, parsed_jd, skill_gap)
    print(f"\n⭐ Job Readiness Score:")
    print(f"  • Overall: {readiness_score.overall_score:.1f}/100")
    print(f"  • Skills: {readiness_score.skill_score:.1f}/100")
    print(f"  • Experience: {readiness_score.experience_score:.1f}/100")
    print(f"  • Education: {readiness_score.education_score:.1f}/100")
    print(f"  • Projects: {readiness_score.project_score:.1f}/100")
    
    print(f"\n💪 Strengths:")
    for strength in readiness_score.strengths:
        print(f"  • {strength}")
    
    if readiness_score.weaknesses:
        print(f"\n⚠️  Areas for Improvement:")
        for weakness in readiness_score.weaknesses:
            print(f"  • {weakness}")
    
    # Generate Summary
    summary = _generate_summary(readiness_score, ats_score, skill_gap)
    print(f"\n📊 SUMMARY:")
    print("-" * 80)
    print(summary)
    
    print("\n" + "=" * 80)
    
    # Test Case 2: Poor Match
    print("\n\nTest Case 2: Junior Candidate vs Senior Architect Role")
    print("-" * 80)
    
    junior_parsed = resume_parser.parse(JUNIOR_RESUME)
    senior_jd_parsed = jd_parser.parse(SENIOR_JOB)
    
    junior_skill_gap = skill_gap_analyzer.analyze(junior_parsed, senior_jd_parsed)
    junior_ats = ats_scorer.score(junior_parsed, senior_jd_parsed)
    junior_readiness = readiness_scorer.score(junior_parsed, senior_jd_parsed, junior_skill_gap)
    
    print(f"\n⭐ Job Readiness Score:")
    print(f"  • Overall: {junior_readiness.overall_score:.1f}/100")
    print(f"  • Skills: {junior_readiness.skill_score:.1f}/100")
    print(f"  • Experience: {junior_readiness.experience_score:.1f}/100")
    
    junior_summary = _generate_summary(junior_readiness, junior_ats, junior_skill_gap)
    print(f"\n📊 SUMMARY:")
    print("-" * 80)
    print(junior_summary)
    
    print("\n" + "=" * 80)
    print("\nAll tests completed successfully! ✅")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(test_analysis())
