# Installation and Setup Guide

## Prerequisites
- Python 3.8 or higher
- pip package manager

## Installation Steps

### 1. Create Virtual Environment (Recommended)
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Download spaCy Model
```bash
python -m spacy download en_core_web_sm
```

## Running the Application

### Start the API Server
```bash
# Development mode with auto-reload
uvicorn main:app --reload

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`

## Testing the System

### Run the Test Script
```bash
python test_system.py
```

This will run the complete analysis pipeline with sample data and display:
- Skill gap analysis
- ATS scoring
- Job readiness scoring
- Detailed recommendations

## API Documentation

Once the server is running, visit:
- Interactive API docs: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

## API Usage Examples

### Using cURL

#### Complete Analysis
```bash
curl -X POST "http://localhost:8000/api/analyze" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "resume_text=Your resume text here..." \
  -d "job_description=Job description text here..."
```

#### ATS Score Only
```bash
curl -X POST "http://localhost:8000/api/ats-score" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "resume_text=Your resume text here..." \
  -d "job_description=Job description text here..."
```

#### Skill Gap Only
```bash
curl -X POST "http://localhost:8000/api/skill-gap" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "resume_text=Your resume text here..." \
  -d "job_description=Job description text here..."
```

### Using Python requests
```python
import requests

resume_text = """
Your resume content here...
"""

job_description = """
Job description content here...
"""

response = requests.post(
    "http://localhost:8000/api/analyze",
    data={
        "resume_text": resume_text,
        "job_description": job_description
    }
)

result = response.json()
print(f"Job Readiness Score: {result['job_readiness_score']['overall_score']}")
print(f"ATS Score: {result['ats_score']['overall_score']}")
print(f"Skill Match: {result['skill_gap_analysis']['skill_match_percentage']}%")
```

### Using JavaScript/fetch
```javascript
const resumeText = "Your resume content...";
const jobDescription = "Job description content...";

const formData = new URLSearchParams();
formData.append('resume_text', resumeText);
formData.append('job_description', jobDescription);

fetch('http://localhost:8000/api/analyze', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData
})
.then(response => response.json())
.then(data => {
    console.log('Job Readiness:', data.job_readiness_score.overall_score);
    console.log('ATS Score:', data.ats_score.overall_score);
    console.log('Summary:', data.summary);
});
```

## Troubleshooting

### spaCy Model Not Found
If you get an error about the spaCy model not being found:
```bash
python -m spacy download en_core_web_sm
```

### Import Errors
Make sure all dependencies are installed:
```bash
pip install -r requirements.txt --upgrade
```

### Port Already in Use
Change the port in the uvicorn command:
```bash
uvicorn main:app --port 8001
```

## Configuration

The system uses default configurations. You can adjust:
- **Match Threshold**: In `main.py`, adjust `SkillGapAnalyzer(match_threshold=75)`
- **Score Weights**: In scorer files, modify the `WEIGHTS` dictionaries
- **Common Skills List**: In `parsers.py`, update `COMMON_SKILLS` array

## Performance Notes

- First request may be slower due to model loading
- Subsequent requests will be faster as models are cached
- For production, consider using multiple workers:
  ```bash
  uvicorn main:app --workers 4
  ```

## API Response Format

All analysis endpoints return JSON with the following structure:
```json
{
  "job_readiness_score": {
    "overall_score": 85.5,
    "skill_score": 90.0,
    "experience_score": 85.0,
    "education_score": 80.0,
    "project_score": 87.0,
    "strengths": ["..."],
    "weaknesses": ["..."]
  },
  "ats_score": {
    "overall_score": 82.3,
    "keyword_match_score": 78.5,
    "formatting_score": 85.0,
    "section_completeness_score": 90.0,
    "recommendations": ["..."]
  },
  "skill_gap_analysis": {
    "matched_skills": [...],
    "missing_required_skills": [...],
    "skill_match_percentage": 85.5,
    "recommendations": ["..."]
  },
  "summary": "Detailed text summary..."
}
```
