# Connect to the OpenAI API
# Send a message to the OpenAI API
# Receive a response from the OpenAI API
# Parse the response
# Return the response

import asyncio
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None


class OpenAIService:
    """
    OpenAI service class for streaming chat responses
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key
        self.base_url = base_url
        self.client = None

        if AsyncOpenAI:
            if base_url:
                # For OpenAI-compatible endpoints (like local LLMs)
                self.client = AsyncOpenAI(api_key=api_key or "dummy", base_url=base_url)
            elif api_key:
                # For official OpenAI API
                self.client = AsyncOpenAI(api_key=api_key)

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-3.5-turbo",
        stream_id: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream chat response from OpenAI or compatible endpoint"""

        if not self.client:
            yield {
                "type": "error",
                "message": "OpenAI library not installed or not configured. Run: pip install openai",
            }
            return

        try:
            # Send initial event
            yield {
                "type": "start",
                "timestamp": datetime.now().isoformat(),
                "model": model,
            }

            # Convert messages to OpenAI format
            openai_messages = []
            for msg in messages:
                openai_messages.append(
                    {"role": msg.get("role", "user"), "content": msg.get("content", "")}
                )

            # Stream response from OpenAI
            stream = await self.client.chat.completions.create(
                model=model, messages=openai_messages, stream=True
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield {
                        "type": "content",
                        "content": content,
                        "timestamp": datetime.now().isoformat(),
                    }

                    # Small delay to make streaming visible
                    await asyncio.sleep(0.01)

            # Send completion event
            yield {"type": "complete", "timestamp": datetime.now().isoformat()}

        except Exception as e:
            yield {
                "type": "error",
                "message": f"OpenAI error: {str(e)}",
                "timestamp": datetime.now().isoformat(),
            }

    def list_models(self) -> List[str]:
        """List available models"""
        if self.base_url:
            # For compatible endpoints, return common models
            return ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "claude-3-sonnet"]
        else:
            # For official OpenAI
            return ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "gpt-4o"]

    def is_available(self) -> bool:
        """Check if OpenAI service is available"""
        return self.client is not None
