import os
import re
from typing import List, Optional, Dict, Any

import httpx

from logger import get_logger

logger = get_logger(__name__)

GEMINI_API_URL_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)


def _load_gemini_api_keys() -> List[str]:
    """
    Load Gemini API keys from the environment.

    Supported patterns:
      - GEMINI_API_KEY_1, GEMINI_API_KEY_2, ..., GEMINI_API_KEY_N
      - GEMINI_API_KEY (single fallback key)
    """
    keys_with_index = []

    for name, value in os.environ.items():
        match = re.fullmatch(r"GEMINI_API_KEY_(\d+)", name)
        if match and value:
            try:
                idx = int(match.group(1))
                keys_with_index.append((idx, value))
            except ValueError:
                continue

    keys_with_index.sort(key=lambda item: item[0])
    keys = [value for _, value in keys_with_index]

    # Fallback single key at the end of the list
    single_key = os.getenv("GEMINI_API_KEY")
    if single_key:
        keys.append(single_key)

    if not keys:
        logger.warning("No GEMINI_API_KEY_* or GEMINI_API_KEY variables found.")

    return keys


class GeminiService:
    """
    Simple Gemini service with automatic API-key fallback.

    Usage:
        service = GeminiService()
        response = await service.generate(
            prompt=\"Explain FastAPI in simple terms\",
            model=\"gemini-1.5-flash\",
        )
    """

    def __init__(
        self,
        api_keys: Optional[List[str]] = None,
        timeout: float = 30.0,
    ) -> None:
        self.api_keys = api_keys or _load_gemini_api_keys()
        if not self.api_keys:
            raise RuntimeError(
                "GeminiService initialised without any API keys. "
                "Set GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... or GEMINI_API_KEY in your .env"
            )

        self.timeout = timeout
        self._current_index = 0

    async def _call_gemini(
        self,
        api_key: str,
        prompt: str,
        model: str,
        extra_payload: Optional[Dict[str, Any]] = None,
    ) -> httpx.Response:
        """
        Low-level call to the Gemini HTTP API using a single API key.
        """
        url = GEMINI_API_URL_TEMPLATE.format(model=model)

        payload: Dict[str, Any] = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                    ]
                }
            ]
        }

        if extra_payload:
            payload.update(extra_payload)

        params = {"key": api_key}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, params=params, json=payload)

        return response

    async def generate(
        self,
        prompt: str,
        model: str = "gemini-1.5-flash",
        extra_payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Call Gemini with automatic fallback:
        - Tries the current API key first.
        - On 401/403/429/500/503 or network error, moves to the next key.
        - Continues until a key succeeds or all keys fail.
        """
        last_error: Optional[Exception] = None
        num_keys = len(self.api_keys)

        for attempt in range(num_keys):
            idx = (self._current_index + attempt) % num_keys
            api_key = self.api_keys[idx]

            try:
                resp = await self._call_gemini(
                    api_key=api_key,
                    prompt=prompt,
                    model=model,
                    extra_payload=extra_payload,
                )

                if resp.status_code == 200:
                    # this key worked; update pointer and return
                    self._current_index = idx
                    return resp.json()

                if resp.status_code in {401, 403, 429, 500, 503}:
                    # likely invalid, rate-limited or transient; try next key
                    logger.warning(
                        "Gemini API key at index %s failed with status %s. "
                        "Trying next key (if available).",
                        idx,
                        resp.status_code,
                    )
                    last_error = RuntimeError(
                        f"Gemini API error {resp.status_code}: {resp.text}"
                    )
                    continue

                # For other status codes, raise immediately
                resp.raise_for_status()
            except Exception as exc:  # network or other errors
                logger.warning(
                    "Gemini API call failed for key index %s: %s. Trying next key.",
                    idx,
                    exc,
                )
                last_error = exc
                continue

        # If we reached here, every key failed
        if last_error:
            raise last_error

        raise RuntimeError("All Gemini API keys failed with unknown errors.")


# Convenience singleton you can import in your routes:
gemini_service = GeminiService()

