# Job Readiness Scoring System

A comprehensive backend system that analyzes resumes against job descriptions to provide:
- **Job Readiness Score**: Overall match score based on skills, projects, experience, and education
- **ATS Score**: Applicant Tracking System compatibility score  
- **Skill Gap Analysis**: Detailed breakdown of missing skills and competencies

## NLP Algorithms Used

1. **Sentence Transformers (SBERT)**: Semantic similarity analysis
2. **spaCy**: Named Entity Recognition and text processing
3. **TF-IDF**: Keyword extraction and importance weighting
4. **Cosine Similarity**: Vector comparison
5. **RapidFuzz**: Fuzzy string matching for flexible skill matching
6. **Custom Weighted Scoring**: Domain-specific scoring algorithms

## Installation

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

## Usage

```bash
uvicorn main:app --reload
```

## API Endpoints

- `POST /api/analyze`: Complete analysis (job readiness, ATS, skill gap)
- `POST /api/ats-score`: Get ATS score only
- `POST /api/skill-gap`: Get skill gap analysis only
- `POST /api/job-readiness`: Get job readiness score only
- `POST /api/parse-resume`: Parse resume only
- `POST /api/parse-job-description`: Parse job description only

## Architecture

- `parsers/`: Resume and job description parsing
- `extractors/`: Skill, experience, education extraction
- `scorers/`: ATS, readiness, and gap scoring logic
- `models/`: Pydantic models for data validation
- `utils/`: Utility functions and helpers
