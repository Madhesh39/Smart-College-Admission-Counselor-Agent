import logging
import httpx
from typing import List, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

async def call_llm(
    prompt_or_system: str, 
    user_prompt: Optional[str] = None, 
    temperature: float = 0.7, 
    max_tokens: int = 1000
) -> Optional[str]:
    """
    Calls the OpenAI-compatible API to generate a response.
    Returns None if AI is disabled or if the API call fails.
    """
    if user_prompt is None:
        system_prompt = "You are an expert, empathetic Indian College Admission Counselor."
        user_content = prompt_or_system
    else:
        system_prompt = prompt_or_system
        user_content = user_prompt
    if not settings.AI_ENABLED:
        logger.info("AI is disabled by settings. Skipping LLM call.")
        return None
        
    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY is not set. Skipping LLM call.")
        return None

    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": settings.LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{settings.OPENAI_API_BASE}/chat/completions",
                headers=headers,
                json=payload
            )
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
            else:
                logger.error(f"LLM API returned error status {response.status_code}: {response.text}")
                return None
    except Exception as e:
        logger.error(f"Failed to connect to LLM API: {str(e)}")
        return None
