# Connect to the Ollama server
# Send a message to the Ollama server
# Receive a response from the Ollama server
# Parse the response
# Return the response

import asyncio
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional
import os

try:
    from ollama import AsyncClient, Client
except ImportError:
    AsyncClient = None
    Client = None


class OllamaService:
    def __init__(self, host: str = "http://localhost:11434"):
        self.host = host
        # Ollama trust_env setting
        trust_env_setting = os.getenv("OLLAMA_TRUST_ENV", "False").lower() == "true"
        verify_ssl_setting = os.getenv("OLLAMA_VERIFY_SSL", "False").lower() == "true"
        self.client = Client(host=host, trust_env=trust_env_setting,verify=verify_ssl_setting) if Client else None
        self.async_client = AsyncClient(host=host, trust_env=trust_env_setting,verify=verify_ssl_setting) if AsyncClient else None
        
    async def stream_chat(
        self, 
        messages: List[Dict[str, str]], 
        model: str = "llama3.2",
        stream_id: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream chat response from Ollama"""
        
        if not self.async_client:
            # Fallback to mock response if ollama not installed
            yield {"type": "error", "message": "Ollama library not installed. Run: pip install ollama"}
            return
            
        try:
            # Send initial event
            yield {
                "type": "start", 
                "timestamp": datetime.now().isoformat(),
                "model": model
            }
            
            # Convert messages to Ollama format
            ollama_messages = []
            for msg in messages:
                ollama_messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
            
            # Stream response from Ollama
            async for part in await self.async_client.chat(
                model=model, 
                messages=ollama_messages, 
                stream=True
            ):
                content = part.get('message', {}).get('content', '')
                if content:
                    yield {
                        "type": "content",
                        "content": content,
                        "timestamp": datetime.now().isoformat()
                    }
                    
                # Small delay to make streaming visible
                await asyncio.sleep(0.01)
            
            # Send completion event
            yield {
                "type": "complete", 
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            yield {
                "type": "error",
                "message": f"Ollama error: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
    
    def list_models(self) -> List[str]:
        """List available Ollama models"""
        if not self.client:
            return []  # No fallbacks - clean slate
            
        try:
            models_response = self.client.list()
            # The ollama client returns Model objects with .model attribute
            try:
                return [model.model for model in models_response.models]  # type: ignore
            except AttributeError:
                return []
        except Exception as e:
            print(f"Error listing Ollama models: {e}")
            return []  # No fallbacks - clean slate
    
    def is_available(self, test_model: Optional[str] = None) -> bool:
        """Check if Ollama service is available, optionally test with a specific model"""
        if not self.client:
            return False
            
        try:
            # First check if Ollama server is reachable
            self.client.list()
            
            # If a specific model is provided, test it
            if test_model:
                try:
                    # Try to get info about the specific model
                    self.client.show(test_model)
                    return True
                except Exception:
                    # Model might not be pulled yet, but server is available
                    return True
            
            return True
        except Exception:
            return False





