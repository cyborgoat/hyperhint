# Connect to the Ollama server
# Send a message to the Ollama server
# Receive a response from the Ollama server
# Parse the response
# Return the response

from typing import AsyncGenerator, List, Dict, Any, Optional
import asyncio
from datetime import datetime
import json

try:
    from ollama import AsyncClient, Client
except ImportError:
    AsyncClient = None
    Client = None


class OllamaService:
    def __init__(self, host: str = "http://localhost:11434"):
        self.host = host
        self.client = Client(host=host) if Client else None
        self.async_client = AsyncClient(host=host) if AsyncClient else None
        
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
            return ["llama3.2", "llama3.1", "codellama"]
            
        try:
            models = self.client.list()
            # The ollama client returns Model objects with .model attribute
            return [model.model for model in models.models]
        except Exception as e:
            print(f"Error listing Ollama models: {e}")
            return ["llama3.2", "llama3.1", "codellama"]
    
    def is_available(self) -> bool:
        """Check if Ollama service is available"""
        if not self.client:
            return False
            
        try:
            self.client.list()
            return True
        except Exception:
            return False





