import os
from typing import Any, AsyncGenerator, Dict, List, Optional

from dotenv import load_dotenv

from ._ollama import OllamaService
from ._openai import OpenAIService

# Load environment variables
load_dotenv()


class LLMManager:
    def __init__(self):
        # Load configuration from environment
        self.default_model = os.getenv("DEFAULT_MODEL", "llama3.2")
        ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        openai_api_key = os.getenv("OPENAI_API_KEY")
        openai_base_url = os.getenv("OPENAI_BASE_URL")
        
        # Initialize LLM services
        self.ollama = OllamaService(host=ollama_host)
        self.openai = OpenAIService(
            api_key=openai_api_key,
            base_url=openai_base_url
        )
        
        # Model to service mapping - will be updated dynamically
        self.model_mapping = {
            # Default Ollama models
            "llama3.2": "ollama",
            "llama3.1": "ollama", 
            "llama2": "ollama",
            "codellama": "ollama",
            "mistral": "ollama",
            "phi": "ollama",
            "gemma": "ollama",
            "deepseek": "ollama",
            "qwen": "ollama",
            
            # OpenAI models
            "gpt-3.5-turbo": "openai",
            "gpt-4": "openai",
            "gpt-4-turbo": "openai",
            "gpt-4o": "openai",
            
            # Claude models (via OpenAI-compatible endpoint)
            "claude-3-sonnet": "openai",
            "claude-3-haiku": "openai",
            "claude-4-sonnet": "openai",
        }
        
        # Update mapping with actual available models
        self._update_model_mapping()
    
    def _update_model_mapping(self):
        """Update model mapping based on actually available models"""
        try:
            # Get available Ollama models
            if self.ollama.is_available():
                ollama_models = self.ollama.list_models()
                for model in ollama_models:
                    # Handle model names with tags (e.g., "llama3.2:latest" -> "llama3.2")
                    clean_name = model.split(':')[0]
                    self.model_mapping[model] = "ollama"
                    self.model_mapping[clean_name] = "ollama"
        except Exception as e:
            print(f"Error updating model mapping: {e}")
    
    async def stream_chat(
        self, 
        messages: List[Dict[str, str]], 
        model: str = None,
        stream_id: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Route chat request to appropriate LLM service"""
        
        if model is None:
            model = self.default_model
            
        service_name = self.model_mapping.get(model, "ollama")
        
        if service_name == "ollama":
            async for chunk in self.ollama.stream_chat(messages, model, stream_id):
                yield chunk
        elif service_name == "openai":
            async for chunk in self.openai.stream_chat(messages, model, stream_id):
                yield chunk
        else:
            yield {
                "type": "error",
                "message": f"Unknown model: {model}",
                "timestamp": "unknown"
            }
    
    def get_available_models(self) -> Dict[str, Any]:
        """Get available models from all services with health status"""
        result = {
            "default_model": self.default_model,
            "services": {
                "ollama": {
                    "available": False,
                    "models": [],
                    "host": self.ollama.host,
                    "status": "offline"
                },
                "openai": {
                    "available": False,
                    "models": [],
                    "status": "offline"
                }
            },
            "all_models": []
        }
        
        # Check Ollama
        try:
            if self.ollama.is_available():
                ollama_models = self.ollama.list_models()
                result["services"]["ollama"]["available"] = True
                result["services"]["ollama"]["models"] = ollama_models
                result["services"]["ollama"]["status"] = "online"
                
                # Add to all_models with provider info
                for model in ollama_models:
                    clean_name = model.split(':')[0]
                    result["all_models"].append({
                        "id": model,
                        "name": model,  # Use original model ID instead of formatting
                        "provider": "Ollama",
                        "service": "ollama",
                        "available": True,
                        "is_default": model == self.default_model or clean_name == self.default_model
                    })
        except Exception as e:
            result["services"]["ollama"]["status"] = f"error: {str(e)}"
        
        # Check OpenAI
        try:
            if self.openai.is_available():
                openai_models = self.openai.list_models()
                result["services"]["openai"]["available"] = True
                result["services"]["openai"]["models"] = openai_models
                result["services"]["openai"]["status"] = "online"
                
                # Add to all_models with provider info
                for model in openai_models:
                    result["all_models"].append({
                        "id": model,
                        "name": model,  # Use original model ID instead of formatting
                        "provider": "OpenAI",
                        "service": "openai", 
                        "available": True,
                        "is_default": model == self.default_model
                    })
        except Exception as e:
            result["services"]["openai"]["status"] = f"error: {str(e)}"
        
        return result
    

    
    def is_model_available(self, model: str) -> bool:
        """Check if a specific model is available"""
        models_info = self.get_available_models()
        for model_info in models_info["all_models"]:
            if model_info["id"] == model or model_info["id"].split(':')[0] == model:
                return model_info["available"]
        return False
    
    def get_model_health(self, model: str) -> Dict[str, Any]:
        """Get health status for a specific model"""
        service_name = self.model_mapping.get(model, "ollama")
        
        if service_name == "ollama":
            return {
                "model": model,
                "service": "ollama",
                "available": self.ollama.is_available(),
                "host": self.ollama.host
            }
        elif service_name == "openai":
            return {
                "model": model,
                "service": "openai", 
                "available": self.openai.is_available(),
                "api_configured": self.openai.api_key is not None
            }
        
        return {
            "model": model,
            "service": "unknown",
            "available": False
        }


# Global LLM manager instance
llm_manager = LLMManager()
