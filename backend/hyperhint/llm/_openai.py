# Connect to the OpenAI API
# Send a message to the OpenAI API
# Receive a response from the OpenAI API
# Parse the response
# Return the response

import asyncio
import os
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional
import httpx

try:
    from openai import AsyncOpenAI, OpenAI
except ImportError:
    AsyncOpenAI = None
    OpenAI = None


class OpenAIService:
    """
    OpenAI service class for streaming chat responses
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key
        self.base_url = base_url
        self.client = None
        self.sync_client = None

        # Determine SSL verification setting for OpenAI
        trust_env_setting = os.getenv("OPENAI_TRUST_ENV", "False").lower() == "true"
        verify_ssl_setting = os.getenv("OPENAI_VERIFY_SSL", "True").lower() == "true"

        # Create httpx clients with configurable verify
        http_client = httpx.Client(trust_env=trust_env_setting, verify=verify_ssl_setting)
        async_http_client = httpx.AsyncClient(trust_env=trust_env_setting, verify=verify_ssl_setting)

        if AsyncOpenAI and OpenAI:
            if base_url:
                # For OpenAI-compatible endpoints (like local LLMs)
                self.client = AsyncOpenAI(api_key=api_key or "dummy", base_url=base_url, http_client=async_http_client)
                self.sync_client = OpenAI(api_key=api_key or "dummy", base_url=base_url, http_client=http_client)
            elif api_key:
                # For official OpenAI API
                self.client = AsyncOpenAI(api_key=api_key, http_client=async_http_client)
                self.sync_client = OpenAI(api_key=api_key, http_client=http_client)

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
        """List available models - returns empty list as models are configured per service"""
        # Models are configured per service instance, not globally
        return []

    def is_available(self, test_model: Optional[str] = None) -> bool:
        """Check if OpenAI service is available by testing connection with actual model"""
        if not self.sync_client:
            return False
            
        # If no test model provided, try to list models first
        if not test_model:
            try:
                models = self.sync_client.models.list()
                if models.data:
                    # Use the first available model for testing
                    test_model = models.data[0].id
                else:
                    # No models available
                    return False
            except Exception:
                # If models.list() fails, we can't test without a specific model
                return False
            
        try:
            # Test connection with the actual model that will be used
            response = self.sync_client.chat.completions.create(
                model=test_model,
                messages=[{"role": "user", "content": "hi"}],
                max_tokens=1,
                stream=False
            )
            return True
        except Exception as e:
            print(f"OpenAI service not available with model '{test_model}': {e}")
            return False

    def get_available_models(self) -> List[str]:
        """Get available models from the endpoint if supported"""
        if not self.sync_client:
            return []
            
        try:
            # Try to list models (works for OpenAI and some compatible endpoints)
            models = self.sync_client.models.list()
            return [model.id for model in models.data]
        except Exception as e:
            print(f"Could not list models from endpoint: {e}")
            # Return empty list - models will be configured manually
            return []
