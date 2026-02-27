from datetime import datetime
import json
import uuid
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

from auth.router import get_current_user
from config import MONGO_URI, MONGO_DB
from .schema import (
    CareerRecommendationRequest,
    CareerRecommendationResponse,
    CareerPath,
    ChatRequest,
    ChatResponse,
    ChatMessage,
    ConversationListResponse,
)
from .career_counselor import career_counselor


router = APIRouter()


# Sync MongoDB client for conversation storage
mongo_client = MongoClient(MONGO_URI)
db_sync = mongo_client[MONGO_DB]
conversations_collection = db_sync["career_conversations"]

# Async MongoDB client for reading user profiles
async_mongo_client = AsyncIOMotorClient(MONGO_URI)
db_async = async_mongo_client[MONGO_DB]
user_profiles_collection = db_async["user_profiles"]


@router.post("/recommend", response_model=CareerRecommendationResponse)
async def get_career_recommendations(
    request: CareerRecommendationRequest,
) -> CareerRecommendationResponse:
    """
    AI Career Path Recommender - Suggests suitable career paths based on user profile.
    Uses Tavily web scraping + Gemini AI to provide real-time career recommendations.
    """
    try:
        from .tavily_service import tavily_service

        tavily_data = await tavily_service.search_career_trends(
            skills=request.skills,
            interests=request.interests,
        )

        # Build prompt for Gemini to analyze and structure the data
        prompt = f"""
Analyze the following web-scraped job market data and user profile, then provide 3-5 personalized career recommendations.

USER PROFILE:
- Skills: {', '.join(request.skills)}
- Interests: {', '.join(request.interests)}
- Education: {request.education}
- Experience: {request.experience_years} years

LATEST JOB MARKET DATA (2026):
{chr(10).join([f"- {result.get('title', '')}: {result.get('content', '')[:200]}" for result in tavily_data.get('results', [])[:8]])}

For each career recommendation, provide:
1. Career Title
2. Match Score (0-1, how well it fits the user)
3. Description (2-3 sentences)
4. Required Skills (list 4-6 key skills)
5. Trending Industries (list 3-4 industries)
6. Average Salary Range
7. Growth Outlook

Return ONLY valid JSON in this exact format:
{{
  "recommendations": [
    {{
      "career_title": "string",
      "match_score": 0.95,
      "description": "string",
      "required_skills": ["skill1", "skill2"],
      "trending_industries": ["industry1", "industry2"],
      "average_salary": "$XX,000 - $XX,000",
      "growth_outlook": "string"
    }}
  ]
}}
"""

        raw = await career_counselor.gemini.generate(prompt)

        # Extract JSON substring from possibly noisy response
        import re

        text = ""
        try:
            from resume_analyzer.routes import (  # type: ignore
                _extract_text_from_gemini_response,
            )

            text = _extract_text_from_gemini_response(raw)
        except Exception:
            # Fallback: best-effort JSON extraction
            text = json.dumps(raw)

        json_match = re.search(r"\{[\s\S]*\}", text)
        if json_match:
            parsed_data = json.loads(json_match.group())
            recommendations = [
                CareerPath(**rec)
                for rec in parsed_data.get("recommendations", [])
            ]
        else:
            raise ValueError("Failed to parse AI response for recommendations")

        return CareerRecommendationResponse(
            recommendations=recommendations,
            timestamp=datetime.utcnow(),
        )

    except Exception as e:
        print(f"Error in career recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends")
async def get_career_trends() -> Dict[str, Any]:
    """
    Get some static career trends and in-demand skills.
    """
    return {
        "trending_careers": [
            "AI/ML Engineer",
            "Cloud Architect",
            "Cybersecurity Analyst",
        ],
        "hot_skills": ["Python", "AWS", "React", "Machine Learning", "Docker"],
        "growing_industries": [
            "AI/ML",
            "Cybersecurity",
            "Cloud Computing",
            "Data Science",
        ],
    }


# ============= CHAT ENDPOINTS =============


@router.post("/chat", response_model=ChatResponse)
async def chat_message(request: ChatRequest) -> ChatResponse:
    """
    Send a message and get AI counseling response.
    Non-streaming endpoint; mostly kept for backwards compatibility.
    """
    try:
        # Get or create conversation
        if request.conversation_id:
            conversation_doc = conversations_collection.find_one(
                {"conversation_id": request.conversation_id}
            )
            if not conversation_doc:
                raise HTTPException(status_code=404, detail="Conversation not found")
        else:
            conversation_id = str(uuid.uuid4())
            conversation_doc = {
                "conversation_id": conversation_id,
                "user_id": request.user_id,
                "title": (
                    request.message[:50] + "..."
                    if len(request.message) > 50
                    else request.message
                ),
                "messages": [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            conversations_collection.insert_one(conversation_doc)

        # Get user profile for context from user_profiles collection
        user_profile_doc = await user_profiles_collection.find_one(
            {"user_id": request.user_id}
        )

        user_profile: Dict[str, Any] | None = None
        if user_profile_doc:
            skills = [
                s.get("name") if isinstance(s, dict) else s
                for s in user_profile_doc.get("skills", [])
            ]
            interests = [
                i.get("name") if isinstance(i, dict) else i
                for i in user_profile_doc.get("interests", [])
            ]

            user_profile = {
                "skills": skills,
                "interests": interests,
                "education": user_profile_doc.get("education", []),
                "experience_years": len(user_profile_doc.get("experiences", [])),
                "experiences": user_profile_doc.get("experiences", []),
                "projects": user_profile_doc.get("projects", []),
            }

        # Add user message to conversation
        user_message = {
            "role": "user",
            "content": request.message,
            "timestamp": datetime.utcnow().isoformat(),
            "attachments": [
                att.model_dump() for att in (request.attachments or [])
            ],
        }

        conversations_collection.update_one(
            {"conversation_id": conversation_doc["conversation_id"]},
            {
                "$push": {"messages": user_message},
                "$set": {"updated_at": datetime.utcnow()},
            },
        )

        # Generate AI response
        ai_response_text, references = await career_counselor.generate_response(
            user_message=request.message,
            user_profile=user_profile,
            conversation_history=conversation_doc.get("messages", []),
            attachments=[
                att.model_dump() for att in (request.attachments or [])
            ],
        )

        ai_message = {
            "role": "assistant",
            "content": ai_response_text,
            "timestamp": datetime.utcnow().isoformat(),
            "references": references,
            "metadata": {},
        }

        conversations_collection.update_one(
            {"conversation_id": conversation_doc["conversation_id"]},
            {
                "$push": {"messages": ai_message},
                "$set": {"updated_at": datetime.utcnow()},
            },
        )

        return ChatResponse(
            conversation_id=conversation_doc["conversation_id"],
            message=ChatMessage(**ai_message),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def chat_message_stream(request: ChatRequest) -> StreamingResponse:
    """
    Send a message and get streaming AI response (Server-Sent Events).
    We currently stream as a single chunk, but keep the SSE interface
    compatible with the Hacksync frontend.
    """

    async def event_generator():
        try:
            # Get or create conversation
            if request.conversation_id:
                conversation_doc = conversations_collection.find_one(
                    {"conversation_id": request.conversation_id}
                )
                if not conversation_doc:
                    yield f"data: {json.dumps({'error': 'Conversation not found'})}\n\n"
                    return
            else:
                conversation_id = str(uuid.uuid4())
                conversation_doc = {
                    "conversation_id": conversation_id,
                    "user_id": request.user_id,
                    "title": (
                        request.message[:50] + "..."
                        if len(request.message) > 50
                        else request.message
                    ),
                    "messages": [],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                }
                conversations_collection.insert_one(conversation_doc)

                # Send conversation ID first
                yield "data: " + json.dumps(
                    {
                        "type": "conversation_id",
                        "conversation_id": conversation_id,
                    }
                ) + "\n\n"

            # Get user profile from user_profiles collection
            user_profile_doc = await user_profiles_collection.find_one(
                {"user_id": request.user_id}
            )

            user_profile: Dict[str, Any] | None = None
            if user_profile_doc:
                skills = [
                    s.get("name") if isinstance(s, dict) else s
                    for s in user_profile_doc.get("skills", [])
                ]
                interests = [
                    i.get("name") if isinstance(i, dict) else i
                    for i in user_profile_doc.get("interests", [])
                ]

                user_profile = {
                    "skills": skills,
                    "interests": interests,
                    "education": user_profile_doc.get("education", []),
                    "experience_years": len(
                        user_profile_doc.get("experiences", [])
                    ),
                    "experiences": user_profile_doc.get("experiences", []),
                    "projects": user_profile_doc.get("projects", []),
                }

            # Add user message
            user_message = {
                "role": "user",
                "content": request.message,
                "timestamp": datetime.utcnow().isoformat(),
                "attachments": [
                    att.model_dump() for att in (request.attachments or [])
                ],
            }

            conversations_collection.update_one(
                {"conversation_id": conversation_doc["conversation_id"]},
                {
                    "$push": {"messages": user_message},
                    "$set": {"updated_at": datetime.utcnow()},
                },
            )

            # Stream AI response (single chunk at the moment)
            full_response = ""
            references_sent = False
            saved_references: list[Dict[str, Any]] = []

            async for chunk, references in career_counselor.generate_streaming_response(
                user_message=request.message,
                user_profile=user_profile,
                conversation_history=conversation_doc.get("messages", []),
                attachments=[
                    att.model_dump() for att in (request.attachments or [])
                ],
            ):
                full_response += chunk

                # Send text chunk
                yield "data: " + json.dumps(
                    {"type": "text", "content": chunk}
                ) + "\n\n"

                # Send references once
                if references and not references_sent:
                    saved_references = references
                    yield "data: " + json.dumps(
                        {"type": "references", "references": references}
                    ) + "\n\n"
                    references_sent = True

            # Save complete AI message to conversation
            ai_message = {
                "role": "assistant",
                "content": full_response,
                "timestamp": datetime.utcnow().isoformat(),
                "references": saved_references,
                "metadata": {},
            }

            conversations_collection.update_one(
                {"conversation_id": conversation_doc["conversation_id"]},
                {
                    "$push": {"messages": ai_message},
                    "$set": {"updated_at": datetime.utcnow()},
                },
            )

            # Send completion signal
            yield "data: " + json.dumps({"type": "done"}) + "\n\n"

        except Exception as e:  # pragma: no cover - debug logging path
            yield "data: " + json.dumps(
                {"type": "error", "message": str(e)}
            ) + "\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/conversations/", response_model=ConversationListResponse)
async def get_my_conversations(
    current_user: dict = Depends(get_current_user),
) -> ConversationListResponse:
    """
    Get all conversations for the authenticated user (for sidebar).
    """
    try:
        user_id = str(current_user["_id"])
        conversations = list(
            conversations_collection.find(
                {"user_id": user_id},
                {
                    "conversation_id": 1,
                    "title": 1,
                    "updated_at": 1,
                    "created_at": 1,
                    "_id": 0,
                },
            ).sort("updated_at", -1)
        )

        # Format timestamps
        for conv in conversations:
            if conv.get("updated_at"):
                updated = conv["updated_at"]
                conv["updated_at"] = (
                    updated.isoformat()
                    if hasattr(updated, "isoformat")
                    else str(updated)
                )
            else:
                conv["updated_at"] = datetime.utcnow().isoformat()

            if conv.get("created_at"):
                created = conv["created_at"]
                conv["created_at"] = (
                    created.isoformat()
                    if hasattr(created, "isoformat")
                    else str(created)
                )
            else:
                conv["created_at"] = datetime.utcnow().isoformat()

        return ConversationListResponse(
            conversations=conversations,
            total=len(conversations),
        )

    except Exception as e:  # pragma: no cover - defensive fallback
        print(f"Error fetching conversations: {str(e)}")
        return ConversationListResponse(conversations=[], total=0)


@router.get(
    "/conversations/{user_id}",
    response_model=ConversationListResponse,
)
async def get_user_conversations(user_id: str) -> ConversationListResponse:
    """
    Get all conversations for a user (legacy endpoint used by sidebar).
    """
    try:
        conversations = list(
            conversations_collection.find(
                {"user_id": user_id},
                {
                    "conversation_id": 1,
                    "title": 1,
                    "updated_at": 1,
                    "created_at": 1,
                    "_id": 0,
                },
            ).sort("updated_at", -1)
        )

        for conv in conversations:
            if conv.get("updated_at"):
                updated = conv["updated_at"]
                conv["updated_at"] = (
                    updated.isoformat()
                    if hasattr(updated, "isoformat")
                    else str(updated)
                )
            else:
                conv["updated_at"] = datetime.utcnow().isoformat()

            if conv.get("created_at"):
                created = conv["created_at"]
                conv["created_at"] = (
                    created.isoformat()
                    if hasattr(created, "isoformat")
                    else str(created)
                )
            else:
                conv["created_at"] = datetime.utcnow().isoformat()

        return ConversationListResponse(
            conversations=conversations,
            total=len(conversations),
        )

    except Exception as e:  # pragma: no cover - defensive fallback
        print(f"Error fetching conversations: {str(e)}")
        return ConversationListResponse(conversations=[], total=0)


@router.get("/conversations/{user_id}/{conversation_id}")
async def get_conversation(user_id: str, conversation_id: str) -> Dict[str, Any]:
    """
    Get full conversation with all messages.
    """
    try:
        conversation = conversations_collection.find_one(
            {"conversation_id": conversation_id, "user_id": user_id},
            {"_id": 0},
        )

        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        if conversation.get("created_at"):
            created = conversation["created_at"]
            conversation["created_at"] = (
                created.isoformat()
                if hasattr(created, "isoformat")
                else str(created)
            )
        if conversation.get("updated_at"):
            updated = conversation["updated_at"]
            conversation["updated_at"] = (
                updated.isoformat()
                if hasattr(updated, "isoformat")
                else str(updated)
            )

        return conversation

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/conversations/{user_id}/{conversation_id}")
async def delete_conversation(user_id: str, conversation_id: str) -> Dict[str, str]:
    """
    Delete a conversation.
    """
    try:
        result = conversations_collection.delete_one(
            {
                "conversation_id": conversation_id,
                "user_id": user_id,
            }
        )

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Conversation not found")

        return {"message": "Conversation deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


