"""
Career Counselor Integration Service
Orchestrates user data + Tavily web intelligence + Gemini AI.
"""

from typing import List, Dict, Optional, AsyncGenerator, Any

from gemini_service import gemini_service
from .tavily_service import tavily_service


def _extract_text_from_gemini_response(response: Dict[str, Any]) -> str:
    """
    Convert a Gemini JSON response into a plain text string by
    concatenating all candidate parts.
    """
    candidates = response.get("candidates", []) or []
    if not candidates:
        raise ValueError("Empty Gemini response: no candidates returned")

    parts = candidates[0].get("content", {}).get("parts", []) or []
    text_chunks: List[str] = []
    for part in parts:
        if isinstance(part, dict) and "text" in part:
            text_chunks.append(str(part["text"]))
    text = "".join(text_chunks).strip()
    if not text:
        raise ValueError("Gemini response did not contain any text content")
    return text


class CareerCounselorService:
    def __init__(self) -> None:
        self.gemini = gemini_service
        print("✓ Career Counselor initialized")

    async def generate_response(
        self,
        user_message: str,
        user_profile: Optional[Dict] = None,
        conversation_history: Optional[List[Dict]] = None,
        attachments: Optional[List[Dict]] = None,
    ) -> tuple[str, List[Dict]]:
        """
        Generate AI counseling response with web intelligence.
        Returns: (response_text, tavily_references)
        """
        # Step 1: Gather intelligence from Tavily
        tavily_data = await self._gather_intelligence(user_message, user_profile)
        references = tavily_service.format_references(tavily_data)

        # Step 2: Build context-rich prompt
        prompt = self._build_counseling_prompt(
            user_message=user_message,
            user_profile=user_profile,
            tavily_data=tavily_data,
            conversation_history=conversation_history,
            attachments=attachments,
        )

        # Step 3: Generate response with Gemini
        raw_response = await self.gemini.generate(prompt)
        response_text = _extract_text_from_gemini_response(raw_response)
        return response_text, references

    async def generate_streaming_response(
        self,
        user_message: str,
        user_profile: Optional[Dict] = None,
        conversation_history: Optional[List[Dict]] = None,
        attachments: Optional[List[Dict]] = None,
    ) -> AsyncGenerator[tuple[str, List[Dict]], None]:
        """
        Stream AI counseling response.
        We don't have true token streaming from Gemini here, so we
        yield the full response as a single chunk.
        """
        tavily_data = await self._gather_intelligence(user_message, user_profile)
        references = tavily_service.format_references(tavily_data)

        prompt = self._build_counseling_prompt(
            user_message=user_message,
            user_profile=user_profile,
            tavily_data=tavily_data,
            conversation_history=conversation_history,
            attachments=attachments,
        )

        raw_response = await self.gemini.generate(prompt)
        response_text = _extract_text_from_gemini_response(raw_response)

        # Yield once with references; caller will treat as a stream.
        yield response_text, references

    async def _gather_intelligence(
        self,
        user_message: str,
        user_profile: Optional[Dict],
    ) -> Dict:
        """
        Intelligently decide what to search based on user query.
        """
        message_lower = user_message.lower()

        # Career suggestion queries
        if any(
            keyword in message_lower
            for keyword in ["suggest", "recommend", "career", "job", "profession"]
        ):
            if user_profile and user_profile.get("skills"):
                skills = user_profile.get("skills", [])
                interests = user_profile.get("interests", [])
                return await tavily_service.search_career_trends(skills, interests)
            # Generic career search if no profile
            return await tavily_service.search_career_trends(
                ["technology"], ["innovation"]
            )

        # Specific career queries
        if any(
            keyword in message_lower
            for keyword in ["tell me about", "what is", "how to become"]
        ):
            return await tavily_service.search_specific_career(user_message)

        # Skill demand queries
        if "demand" in message_lower or "market" in message_lower:
            if user_profile and user_profile.get("skills"):
                skills = user_profile.get("skills", [])
                return await tavily_service.search_skill_demand(skills)
            return await tavily_service.search_skill_demand(
                ["programming", "AI", "data science"]
            )

        # Default: broad search
        if user_profile and user_profile.get("skills"):
            skills = user_profile.get("skills", [])[:2]
            interests = user_profile.get("interests", [])[:1]
            return await tavily_service.search_career_trends(skills, interests)

        # Generic trending careers search
        return await tavily_service.search_career_trends(
            ["technology"], ["career growth"]
        )

    def _build_counseling_prompt(
        self,
        user_message: str,
        user_profile: Optional[Dict],
        tavily_data: Dict,
        conversation_history: Optional[List[Dict]],
        attachments: Optional[List[Dict]],
    ) -> str:
        """
        Build comprehensive prompt for Gemini.
        """
        prompt_parts: List[str] = [
            "You are an empathetic AI Career Counselor helping professionals navigate their career paths.",
            "Your role is to provide personalized, actionable, and encouraging career guidance.",
            "",
        ]

        # Add user profile context (if available)
        if user_profile:
            prompt_parts.append("=== USER PROFILE ===")
            prompt_parts.append(f"Skills: {', '.join(user_profile.get('skills', []))}")
            prompt_parts.append(
                f"Interests: {', '.join(user_profile.get('interests', []))}"
            )
            prompt_parts.append(
                f"Education: {user_profile.get('education', 'Not specified')}"
            )
            prompt_parts.append(
                f"Experience: {user_profile.get('experience_years', 0)} years"
            )
            prompt_parts.append("")

        # Add web intelligence
        if tavily_data.get("results"):
            prompt_parts.append("=== CURRENT MARKET INTELLIGENCE (2026) ===")
            for result in tavily_data["results"][:5]:
                prompt_parts.append(
                    f"- {result.get('title', '')}: "
                    f"{result.get('content', '')[:150]}"
                )
            prompt_parts.append("")

        # Add conversation history (last 10 messages)
        if conversation_history:
            if len(conversation_history) > 0:
                prompt_parts.append("=== CONVERSATION HISTORY ===")
                for msg in conversation_history[-10:]:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    prompt_parts.append(f"{role.upper()}: {content[:200]}")
                prompt_parts.append("")

        # Handle attachments (metadata only, content not embedded here)
        if attachments:
            if len(attachments) > 0:
                prompt_parts.append("=== USER ATTACHMENTS ===")
                for att in attachments:
                    prompt_parts.append(
                        f"- {att.get('type', 'unknown')}: "
                        f"{att.get('filename', 'unnamed')}"
                    )
                prompt_parts.append("")

        # Add instructions
        prompt_parts.extend(
            [
                "=== INSTRUCTIONS ===",
                "1. Consider the user's profile data, but use your judgment on what's relevant.",
                "2. Reference the market intelligence naturally (don't just list sources).",
                "3. Be conversational, empathetic, and encouraging.",
                "4. Provide specific, actionable advice with clear next steps.",
                "5. If suggesting careers, explain WHY they're a good fit.",
                "6. Handle career anxiety with empathy and realistic optimism.",
                "7. Keep responses concise but comprehensive (aim for 150-250 words).",
                "",
                "=== USER QUESTION ===",
                user_message,
                "",
                "Now provide your counseling response:",
            ]
        )

        return "\n".join(prompt_parts)


# Singleton instance
career_counselor = CareerCounselorService()

