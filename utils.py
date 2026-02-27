"""
Utility functions for text processing and NLP operations
"""
import re
import spacy
from typing import List, Set, Tuple
from rapidfuzz import fuzz
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Load spaCy model (will be initialized on first use)
_nlp = None


def get_nlp():
    """Lazy load spaCy model"""
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            print("Downloading spaCy model...")
            import subprocess
            subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
            _nlp = spacy.load("en_core_web_sm")
    return _nlp


def clean_text(text: str) -> str:
    """Clean and normalize text"""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove special characters but keep alphanumeric and basic punctuation
    text = re.sub(r'[^\w\s\.\,\-\+\#]', ' ', text)
    return text.strip()


def extract_email(text: str) -> List[str]:
    """Extract email addresses from text"""
    pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    return re.findall(pattern, text)


def extract_phone(text: str) -> List[str]:
    """Extract phone numbers from text"""
    patterns = [
        r'\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',
        r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    ]
    phones = []
    for pattern in patterns:
        phones.extend(re.findall(pattern, text))
    return phones


def extract_urls(text: str) -> List[str]:
    """Extract URLs from text"""
    pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
    return re.findall(pattern, text)


def extract_entities(text: str) -> dict:
    """Extract named entities using spaCy"""
    nlp = get_nlp()
    doc = nlp(text)
    
    entities = {
        'PERSON': [],
        'ORG': [],
        'GPE': [],
        'DATE': [],
        'MONEY': [],
        'SKILL': []
    }
    
    for ent in doc.ents:
        if ent.label_ in entities:
            entities[ent.label_].append(ent.text)
    
    return entities


def extract_noun_phrases(text: str) -> List[str]:
    """Extract noun phrases that might be skills or technologies"""
    nlp = get_nlp()
    doc = nlp(text)
    return [chunk.text for chunk in doc.noun_chunks]


def calculate_cosine_similarity(text1: str, text2: str) -> float:
    """Calculate cosine similarity between two texts using TF-IDF"""
    try:
        vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 2),
            max_features=5000
        )
        vectors = vectorizer.fit_transform([text1, text2])
        similarity = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
        return float(similarity)
    except:
        return 0.0


def fuzzy_match_skill(skill: str, skill_list: List[str], threshold: int = 80) -> Tuple[bool, str, float]:
    """
    Fuzzy match a skill against a list of skills
    Returns: (matched, best_match, score)
    """
    best_score = 0
    best_match = ""
    
    skill_lower = skill.lower().strip()
    
    for candidate in skill_list:
        candidate_lower = candidate.lower().strip()
        
        # Exact match
        if skill_lower == candidate_lower:
            return True, candidate, 100.0
        
        # Check if one contains the other
        if skill_lower in candidate_lower or candidate_lower in skill_lower:
            score = 95.0
        else:
            # Fuzzy matching
            score = fuzz.ratio(skill_lower, candidate_lower)
        
        if score > best_score:
            best_score = score
            best_match = candidate
    
    matched = best_score >= threshold
    return matched, best_match if matched else "", float(best_score)


def extract_years_of_experience(text: str) -> List[int]:
    """Extract years of experience mentioned in text"""
    patterns = [
        r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)',
        r'(?:experience|exp)\s*(?:of\s*)?(\d+)\+?\s*(?:years?|yrs?)',
    ]
    
    years = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        years.extend([int(m) for m in matches])
    
    return years


def normalize_skill(skill: str) -> str:
    """Normalize skill name for better matching"""
    skill = skill.lower().strip()
    
    # Remove common prefixes/suffixes
    skill = re.sub(r'\(.*?\)', '', skill)
    skill = re.sub(r'\[.*?\]', '', skill)
    
    # Normalize common variations
    replacements = {
        'javascript': 'javascript',
        'js': 'javascript',
        'typescript': 'typescript',
        'ts': 'typescript',
        'python3': 'python',
        'py': 'python',
        'reactjs': 'react',
        'react.js': 'react',
        'nodejs': 'node.js',
        'node': 'node.js',
        'c++': 'cpp',
        'c#': 'csharp',
    }
    
    return replacements.get(skill, skill).strip()


def extract_keywords_tfidf(text: str, top_n: int = 20) -> List[Tuple[str, float]]:
    """Extract top keywords using TF-IDF"""
    try:
        vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 3),
            max_features=100
        )
        
        tfidf_matrix = vectorizer.fit_transform([text])
        feature_names = vectorizer.get_feature_names_out()
        scores = tfidf_matrix.toarray()[0]
        
        # Get top N keywords
        top_indices = scores.argsort()[-top_n:][::-1]
        keywords = [(feature_names[i], scores[i]) for i in top_indices if scores[i] > 0]
        
        return keywords
    except:
        return []


def tokenize_and_clean(text: str) -> List[str]:
    """Tokenize text and return cleaned tokens"""
    nlp = get_nlp()
    doc = nlp(text.lower())
    
    tokens = [
        token.text for token in doc 
        if not token.is_stop 
        and not token.is_punct 
        and not token.is_space
        and len(token.text) > 2
    ]
    
    return tokens


def calculate_keyword_density(keywords: List[str], text: str) -> float:
    """Calculate keyword density (percentage of keywords found in text)"""
    if not keywords:
        return 0.0
    
    text_lower = text.lower()
    tokens = tokenize_and_clean(text_lower)
    
    found_count = 0
    for keyword in keywords:
        keyword_lower = keyword.lower()
        # Check exact match or if keyword appears in tokens
        if keyword_lower in text_lower:
            found_count += 1
        else:
            # Check if any token matches
            keyword_tokens = tokenize_and_clean(keyword_lower)
            if any(kt in tokens for kt in keyword_tokens):
                found_count += 1
    
    return (found_count / len(keywords)) * 100 if keywords else 0.0
