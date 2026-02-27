"""
API routes for explainer operations
"""
import re
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body, Depends
from typing import Optional, List, Dict, Any
from logger import get_logger
from explainer.services import generate_explanation, generate_chat_response
from explainer.schemas import ExplainerChatRequest, ExplainerChatResponse, SaveExplainerRequest
from interview_agent.pdf_service import extract_text_from_pdf_bytes
from auth.router import get_current_user
from database import db, get_next_sequence
import httpx

logger = get_logger(__name__)

router = APIRouter()


async def _extract_text_from_url(url: str) -> str:
    """
    Very simple URL content extractor using httpx.
    """
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, follow_redirects=True)
            resp.raise_for_status()
            html = resp.text
    except Exception as exc:
        logger.error("Failed to fetch URL %s: %s", url, exc)
        raise HTTPException(status_code=400, detail="Failed to fetch URL content") from exc

    # Strip HTML tags (basic) and collapse whitespace
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text)
    cleaned = text.strip()
    if len(cleaned) < 100:
        raise HTTPException(
            status_code=400,
            detail="Extracted too little text from URL. Try a different page or paste the text directly.",
        )
    return cleaned


@router.post("/generate")
async def generate_explainer(
    text: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    pdf: Optional[UploadFile] = File(None),
    complexity: str = Form("medium"),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate detailed explanation from text, URL, or PDF
    """
    logger.info("=" * 80)
    logger.info(f"[EXPLAINER ROUTE] POST /generate endpoint called")
    logger.info(f"[EXPLAINER ROUTE] Parameters received:")
    logger.info(f"[EXPLAINER ROUTE]   - complexity: {complexity}")
    logger.info(f"[EXPLAINER ROUTE]   - text provided: {'Yes' if text else 'No'}")
    logger.info(f"[EXPLAINER ROUTE]   - url provided: {'Yes' if url else 'No'}")
    logger.info(f"[EXPLAINER ROUTE]   - pdf provided: {'Yes' if pdf else 'No'}")
    
    try:
        content = ""
        source_type = None
        
        # Extract content based on source type
        if pdf:
            logger.info(f"[EXPLAINER ROUTE] Processing PDF source")
            source_type = "PDF"
            file_content = await pdf.read()
            content = extract_text_from_pdf_bytes(file_content)
        elif url:
            logger.info(f"[EXPLAINER ROUTE] Processing URL source")
            source_type = "URL"
            content = await _extract_text_from_url(url)
        elif text:
            logger.info(f"[EXPLAINER ROUTE] Processing text source")
            source_type = "TEXT"
            content = text
        else:
            logger.error(f"[EXPLAINER ROUTE ERROR] No input source provided")
            logger.info("=" * 80)
            raise HTTPException(status_code=400, detail="Please provide text, PDF, or URL")
        
        logger.info(f"[EXPLAINER ROUTE] Content extracted from {source_type}")
        logger.info(f"[EXPLAINER ROUTE] Content length: {len(content)} characters")
        
        # Get user profile for personalized explanation
        user_profile = None
        try:
            user_email = current_user.get("email")
            user_data = await db["users"].find_one({"email": user_email})
            if user_data:
                user_profile = {
                    "learner_type": user_data.get("learner_type"),
                    "age_group": user_data.get("age_group"),
                    "preferred_learning_style": user_data.get("preferred_learning_style"),
                    "education_level": user_data.get("education_level"),
                    "learning_goals": user_data.get("learning_goals", []),
                    "interests": user_data.get("interests", [])
                }
                logger.info(f"[EXPLAINER ROUTE] User profile loaded: learner_type={user_profile.get('learner_type')}, age_group={user_profile.get('age_group')}")
        except Exception as e:
            logger.warning(f"[EXPLAINER ROUTE] Could not load user profile: {e}")
        
        # Generate explanation
        logger.info(f"[EXPLAINER ROUTE] Calling explanation service")
        explanation_data = await generate_explanation(
            content=content,
            complexity=complexity,
            source_type=source_type,
            user_profile=user_profile
        )
        
        logger.info(f"[EXPLAINER ROUTE] Explanation generated successfully")
        logger.info("=" * 80)
        
        # Add metadata
        explanation_data["original_content"] = content
        explanation_data["content_source"] = source_type.lower()
        
        return explanation_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"[EXPLAINER ROUTE ERROR] Unexpected error: {str(e)}")
        logger.error("=" * 80)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=ExplainerChatResponse)
async def explainer_chat(
    request: ExplainerChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Handle chat questions about explained content
    """
    logger.info("=" * 80)
    logger.info(f"[EXPLAINER CHAT ROUTE] POST /chat endpoint called")
    logger.info(f"[EXPLAINER CHAT ROUTE] Question: {request.question[:100]}")
    logger.info(f"[EXPLAINER CHAT ROUTE] Chat history length: {len(request.chat_history)} messages")
    logger.info(f"[EXPLAINER CHAT ROUTE] Explainer content length: {len(request.explainer_content)} characters")
    
    # Get user profile for personalized chat
    user_profile = None
    try:
        user_email = current_user.get("email")
        user_data = await db["users"].find_one({"email": user_email})
        if user_data:
            user_profile = {
                "learner_type": user_data.get("learner_type"),
                "age_group": user_data.get("age_group"),
                "preferred_learning_style": user_data.get("preferred_learning_style"),
                "education_level": user_data.get("education_level"),
                "learning_goals": user_data.get("learning_goals", []),
                "interests": user_data.get("interests", [])
            }
            logger.info(f"[EXPLAINER CHAT ROUTE] User profile loaded: learner_type={user_profile.get('learner_type')}, age_group={user_profile.get('age_group')}")
    except Exception as e:
        logger.warning(f"[EXPLAINER CHAT ROUTE] Could not load user profile: {e}")
    
    # Validate request
    if not request.question or not request.question.strip():
        logger.error(f"[EXPLAINER CHAT ROUTE ERROR] Empty question")
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    if not request.explainer_content:
        logger.error(f"[EXPLAINER CHAT ROUTE ERROR] Empty explainer content")
        raise HTTPException(status_code=400, detail="Explainer content is required")
    
    try:
        # Convert chat history to dict format
        chat_history = []
        for msg in request.chat_history:
            if isinstance(msg, dict):
                chat_history.append(msg)
            else:
                chat_history.append({"role": getattr(msg, 'role', 'user'), "content": getattr(msg, 'content', '')})
        
        logger.info(f"[EXPLAINER CHAT ROUTE] Processing chat with {len(chat_history)} history messages")
        
        chat_response = await generate_chat_response(
            explainer_content=request.explainer_content,
            chat_history=chat_history,
            question=request.question.strip(),
            user_profile=user_profile
        )
        
        logger.info(f"[EXPLAINER CHAT ROUTE] Chat response generated successfully")
        logger.info(f"[EXPLAINER CHAT ROUTE] Answer length: {len(chat_response.get('answer', ''))} characters")
        logger.info("=" * 80)
        
        return ExplainerChatResponse(**chat_response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"[EXPLAINER CHAT ROUTE ERROR] {type(e).__name__}: {str(e)}")
        logger.error("=" * 80, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat response failed: {str(e)}")


@router.post("/save")
async def save_explainer(
    request: SaveExplainerRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Save an explainer explanation for the current user.
    """
    logger.info("=" * 80)
    logger.info(f"[EXPLAINER SAVE] POST /save endpoint called")
    logger.info(f"[EXPLAINER SAVE] Content source: {request.content_source}")
    logger.info(f"[EXPLAINER SAVE] Complexity: {request.complexity}")
    
    try:
        user_id = str(current_user.get("_id") or current_user.get("user_id"))
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid user")
        
        explainer_id = await get_next_sequence("explanations")
        
        doc = {
            "explainer_id": explainer_id,
            "user_id": user_id,
            "user_email": current_user.get("email"),
            "explanation": request.explanation,
            "title": request.explanation.get("title", "Untitled"),
            "original_content": request.original_content[:5000],  # Store first 5000 chars
            "content_source": request.content_source,
            "complexity": request.complexity,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        result = await db["explanations"].insert_one(doc)
        logger.info(f"[EXPLAINER SAVE] Saved explanation {explainer_id} for user {user_id}")
        logger.info("=" * 80)
        
        return {
            "success": True,
            "explainer_id": explainer_id,
            "message": "Explanation saved successfully",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"[EXPLAINER SAVE ERROR] {type(e).__name__}: {str(e)}")
        logger.error("=" * 80, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save explanation: {str(e)}")


@router.get("/history")
async def get_explainer_history(current_user: dict = Depends(get_current_user)):
    """
    List explainer explanations for the current user (without full content).
    """
    logger.info("=" * 80)
    logger.info(f"[EXPLAINER HISTORY] GET /history endpoint called")
    
    try:
        user_id = str(current_user.get("_id") or current_user.get("user_id"))
        cursor = db["explanations"].find(
            {"user_id": user_id},
            {"explanation": 0, "original_content": 0},  # Exclude large fields
        ).sort("created_at", -1)
        
        explanations: List[Dict[str, Any]] = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            created = doc.get("created_at")
            updated = doc.get("updated_at")
            if isinstance(created, datetime):
                doc["created_at"] = created.isoformat()
            if isinstance(updated, datetime):
                doc["updated_at"] = updated.isoformat()
            explanations.append(doc)
        
        logger.info(f"[EXPLAINER HISTORY] Found {len(explanations)} explanations for user {user_id}")
        logger.info("=" * 80)
        
        return {
            "success": True,
            "explanations": explanations,
            "count": len(explanations),
        }
        
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"[EXPLAINER HISTORY ERROR] {type(e).__name__}: {str(e)}")
        logger.error("=" * 80, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to load history: {str(e)}")


@router.get("/history/{explainer_id}")
async def get_explainer_by_id(
    explainer_id: int, current_user: dict = Depends(get_current_user)
):
    """
    Fetch a single explainer explanation by ID.
    """
    logger.info("=" * 80)
    logger.info(f"[EXPLAINER HISTORY DETAIL] GET /history/{explainer_id} endpoint called")
    
    try:
        user_id = str(current_user.get("_id") or current_user.get("user_id"))
        doc = await db["explanations"].find_one(
            {"explainer_id": explainer_id, "user_id": user_id}
        )
        
        if not doc:
            logger.warning(f"[EXPLAINER HISTORY DETAIL] Explanation {explainer_id} not found for user {user_id}")
            raise HTTPException(status_code=404, detail="Explanation not found")
        
        doc["_id"] = str(doc["_id"])
        created = doc.get("created_at")
        updated = doc.get("updated_at")
        if isinstance(created, datetime):
            doc["created_at"] = created.isoformat()
        if isinstance(updated, datetime):
            doc["updated_at"] = updated.isoformat()
        
        logger.info(f"[EXPLAINER HISTORY DETAIL] Retrieved explanation {explainer_id}")
        logger.info("=" * 80)
        
        return {"success": True, "explanation": doc}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"[EXPLAINER HISTORY DETAIL ERROR] {type(e).__name__}: {str(e)}")
        logger.error("=" * 80, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to load explanation: {str(e)}")
