import os
import json
from typing import Any, AsyncGenerator, Dict, List, Optional
from pathlib import Path

from dotenv import load_dotenv

from ._ollama import OllamaService
from ._openai import OpenAIService

# Load environment variables
load_dotenv()


class ServiceConfig:
    """Configuration for LLM services"""
    def __init__(self, config_file: str = "llm_config.json"):
        self.config_file = Path(config_file)
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading config: {e}")
        
        # Return clean slate - no defaults
        return {
            "services": {},
            "default_model": None
        }
    
    def save_config(self):
        """Save configuration to file"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            print(f"Error saving config: {e}")
    
    def add_service(self, service_id: str, service_type: str, config: Dict[str, Any]):
        """Add or update a service configuration"""
        if "services" not in self.config:
            self.config["services"] = {}
        
        self.config["services"][service_id] = {
            "type": service_type,
            "config": config,
            "enabled": True
        }
        self.save_config()
    
    def remove_service(self, service_id: str):
        """Remove a service configuration"""
        if "services" in self.config and service_id in self.config["services"]:
            del self.config["services"][service_id]
            self.save_config()
    
    def get_services(self) -> Dict[str, Any]:
        """Get all configured services"""
        return self.config.get("services", {})
    
    def set_default_model(self, model: str):
        """Set the default model"""
        self.config["default_model"] = model
        self.save_config()
    
    def get_default_model(self) -> Optional[str]:
        """Get the default model"""
        return self.config.get("default_model")


class LLMManager:
    def __init__(self):
        self.service_config = ServiceConfig()
        self.services = {}
        self.model_mapping = {}
        
        # Initialize services from configuration
        self._initialize_services()
        
        # Update mapping with actual available models
        self._update_model_mapping()
    
    def _initialize_services(self):
        """Initialize services from configuration"""
        self.services = {}
        
        configured_services = self.service_config.get_services()
        
        # No default services - clean slate
        for service_id, service_info in configured_services.items():
            if not service_info.get("enabled", True):
                continue
                
            service_type = service_info["type"]
            config = service_info["config"]
            
            try:
                if service_type == "ollama":
                    self.services[service_id] = OllamaService(host=config["host"])
                elif service_type == "openai":
                    self.services[service_id] = OpenAIService(
                        api_key=config.get("api_key"),
                        base_url=config.get("base_url")
                    )
            except Exception as e:
                print(f"Error initializing service {service_id}: {e}")
    
    def _update_model_mapping(self):
        """Update model mapping based on configured models"""
        self.model_mapping = {}
        
        configured_services = self.service_config.get_services()
        
        for service_id, service_info in configured_services.items():
            if not service_info.get("enabled", True):
                continue
                
            # Map all configured models to their service
            configured_models = service_info.get("config", {}).get("models", [])
            for model in configured_models:
                # Handle model names with tags (e.g., "llama3.2:latest" -> "llama3.2")
                clean_name = model.split(':')[0]
                self.model_mapping[model] = service_id
                self.model_mapping[clean_name] = service_id
    
    def add_service(self, service_id: str, service_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new service configuration"""
        try:
            # Test the service configuration
            if service_type == "ollama":
                test_service = OllamaService(host=config["host"])
                available = test_service.is_available()
                models = test_service.list_models() if available else []
            elif service_type == "openai":
                test_service = OpenAIService(
                    api_key=config.get("api_key"),
                    base_url=config.get("base_url")
                )
                available = test_service.is_available()
                models = config.get("models", [])  # For OpenAI, models are manually configured
            else:
                return {"success": False, "error": f"Unknown service type: {service_type}"}
            
            # Save configuration
            self.service_config.add_service(service_id, service_type, config)
            
            # Re-initialize services
            self._initialize_services()
            self._update_model_mapping()
            
            return {
                "success": True,
                "service_id": service_id,
                "available": available,
                "models": models
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def remove_service(self, service_id: str) -> Dict[str, Any]:
        """Remove a service configuration"""
        try:
            self.service_config.remove_service(service_id)
            self._initialize_services()
            self._update_model_mapping()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def test_service(self, service_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Test a service configuration without saving it"""
        try:
            if service_type == "ollama":
                test_service = OllamaService(host=config["host"])
                available = test_service.is_available()
                models = test_service.list_models() if available else []
                return {
                    "success": True,
                    "available": available,
                    "models": models,
                    "host": config["host"]
                }
            elif service_type == "openai":
                test_service = OpenAIService(
                    api_key=config.get("api_key"),
                    base_url=config.get("base_url")
                )
                
                # Get user-provided models for testing
                user_models = config.get("models", [])
                
                # Test availability with user-provided models
                available = False
                tested_models = []
                
                if user_models:
                    # Test with the first user-provided model
                    available = test_service.is_available(user_models[0])
                    tested_models = user_models
                else:
                    # No user models provided, try to discover models from endpoint
                    discovered_models = test_service.get_available_models()
                    if discovered_models:
                        available = test_service.is_available(discovered_models[0])
                        tested_models = discovered_models
                    else:
                        # Can't test without models, but service might still be reachable
                        available = False
                        tested_models = []
                
                return {
                    "success": True,
                    "available": available,
                    "models": tested_models,
                    "base_url": config.get("base_url"),
                    "endpoint_supports_model_list": len(test_service.get_available_models()) > 0,
                    "tested_with_user_models": len(user_models) > 0
                }
            else:
                return {"success": False, "error": f"Unknown service type: {service_type}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def stream_chat(
        self, 
        messages: List[Dict[str, str]], 
        model: str = None,
        stream_id: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Route chat request to appropriate LLM service"""
        
        if model is None:
            default_model = self.service_config.get_default_model()
            if default_model is None:
                yield {
                    "type": "error",
                    "message": "No model specified and no default model configured",
                    "timestamp": "unknown"
                }
                return
            model = default_model
            
        service_id = self.model_mapping.get(model)
        
        if service_id and service_id in self.services:
            service = self.services[service_id]
            async for chunk in service.stream_chat(messages, model, stream_id):
                yield chunk
        else:
            yield {
                "type": "error",
                "message": f"Model '{model}' not available in any configured service",
                "timestamp": "unknown"
            }
    
    def get_available_models(self) -> Dict[str, Any]:
        """Get available models from all configured services with health status"""
        result = {
            "default_model": self.service_config.get_default_model(),
            "services": {},
            "all_models": []
        }
        
        configured_services = self.service_config.get_services()
        
        for service_id, service_info in configured_services.items():
            service_type = service_info["type"]
            config = service_info["config"]
            enabled = service_info.get("enabled", True)
            
            service_result = {
                "id": service_id,
                "type": service_type,
                "name": config.get("name", service_id),
                "enabled": enabled,
                "available": False,
                "models": [],
                "status": "offline",
                "config": {k: v for k, v in config.items() if k != "api_key"}  # Don't expose API key
            }
            
            if enabled and service_id in self.services:
                service = self.services[service_id]
                try:
                    configured_models = config.get("models", [])
                    
                    # Only test Ollama services automatically to avoid token consumption
                    # OpenAI services are assumed to be available if configured
                    if service_type == "ollama":
                        # Test with the first configured model if available
                        test_model = configured_models[0] if configured_models else None
                        
                        if service.is_available(test_model):
                            service_result["available"] = True
                            service_result["status"] = "online"
                            
                            # Use only the configured models, not all available models
                            service_result["models"] = configured_models
                            
                            # Add to all_models - only the configured models
                            for model in configured_models:
                                result["all_models"].append({
                                    "id": model,
                                    "name": model,
                                    "provider": config.get("name", service_type.title()),
                                    "service": service_id,
                                    "service_type": service_type,
                                    "available": True,
                                    "is_default": model == result["default_model"]
                                })
                        else:
                            service_result["status"] = "offline"
                            # Still show configured models even if service is offline
                            service_result["models"] = configured_models
                            
                            # Add to all_models but mark as unavailable
                            for model in configured_models:
                                result["all_models"].append({
                                    "id": model,
                                    "name": model,
                                    "provider": config.get("name", service_type.title()),
                                    "service": service_id,
                                    "service_type": service_type,
                                    "available": False,
                                    "is_default": model == result["default_model"]
                                })
                    else:
                        # For OpenAI services, assume they're available if configured
                        # User can test them manually to verify
                        service_result["available"] = True
                        service_result["status"] = "configured"  # Different status to indicate not tested
                        service_result["models"] = configured_models
                        
                        # Add to all_models and mark as available (assumed)
                        for model in configured_models:
                            result["all_models"].append({
                                "id": model,
                                "name": model,
                                "provider": config.get("name", service_type.title()),
                                "service": service_id,
                                "service_type": service_type,
                                "available": True,  # Assumed available
                                "is_default": model == result["default_model"]
                            })
                        
                except Exception as e:
                    service_result["status"] = f"error: {str(e)}"
                    # Still show configured models even if there's an error
                    configured_models = config.get("models", [])
                    service_result["models"] = configured_models
                    
                    # Add to all_models but mark as unavailable
                    for model in configured_models:
                        result["all_models"].append({
                            "id": model,
                            "name": model,
                            "provider": config.get("name", service_type.title()),
                            "service": service_id,
                            "service_type": service_type,
                            "available": False,
                            "is_default": model == result["default_model"]
                        })
            
            result["services"][service_id] = service_result
        
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
        service_id = self.model_mapping.get(model)
        
        if service_id and service_id in self.services:
            service = self.services[service_id]
            configured_services = self.service_config.get_services()
            service_info = configured_services.get(service_id, {})
            
            return {
                "model": model,
                "service": service_id,
                "service_type": service_info.get("type", "unknown"),
                "available": service.is_available(model),
                "config": {k: v for k, v in service_info.get("config", {}).items() if k != "api_key"}
            }
        
        return {
            "model": model,
            "service": "unknown",
            "available": False
        }
    
    def set_default_model(self, model: str) -> Dict[str, Any]:
        """Set the default model"""
        try:
            if self.is_model_available(model):
                self.service_config.set_default_model(model)
                return {"success": True, "default_model": model}
            else:
                return {"success": False, "error": f"Model '{model}' is not available"}
        except Exception as e:
            return {"success": False, "error": str(e)}


# Global LLM manager instance
llm_manager = LLMManager()
