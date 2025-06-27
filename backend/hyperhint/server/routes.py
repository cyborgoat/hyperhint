from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, Any, List

from hyperhint.llm import llm_manager
from hyperhint.memory import action_handler, knowledge_file_handler

router = APIRouter()


class FilenameRequest(BaseModel):
    previews: str


class ServiceConfigRequest(BaseModel):
    service_id: str
    service_type: str  # "ollama" or "openai"
    config: Dict[str, Any]


class TestServiceRequest(BaseModel):
    service_type: str  # "ollama" or "openai"
    config: Dict[str, Any]


class SetDefaultModelRequest(BaseModel):
    model: str


@router.post("/generate-filename")
async def generate_filename(request: FilenameRequest):
    """Generate a filename from content previews using an LLM"""
    prompt = f"""Based on the following file previews, generate a single, short, descriptive, snake_case filename.
The filename should not include an extension.
Return ONLY the filename and nothing else. Be concise.

Previews:
{request.previews}
"""
    messages = [{"role": "user", "content": prompt}]

    filename_content = ""
    async for chunk in llm_manager.stream_chat(messages):
        if chunk.get("type") == "content":
            filename_content += chunk.get("content", "")

    import re

    filename = filename_content.strip().lower().replace(" ", "_")
    filename = re.sub(r"[^a-z0-9_]", "", filename)
    filename = re.sub(r"__+", "_", filename)

    if not filename:
        filename = "knowledge_file"

    return {"filename": filename}


@router.get("/files")
async def get_file_suggestions(q: str = Query("", description="Search query")):
    """Get file suggestions for autocomplete"""
    try:
        suggestions = knowledge_file_handler.search(q)
        return [suggestion.model_dump() for suggestion in suggestions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching files: {str(e)}")


@router.get("/files/content")
async def get_file_content(path: str = Query(..., description="File path")):
    """Get file content by path"""
    try:
        content = knowledge_file_handler.read_file_content(path)
        if content is None:
            raise HTTPException(status_code=404, detail="File not found")
        return content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")





@router.get("/actions")
async def get_action_suggestions(q: str = Query("", description="Search query")):
    """Get action suggestions for autocomplete"""
    try:
        suggestions = action_handler.search(q)
        return [suggestion.model_dump() for suggestion in suggestions]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error searching actions: {str(e)}"
        )


@router.get("/stats")
async def get_stats():
    """Get system statistics"""
    try:
        # Get memory stats
        memory_stats = {
            "total_items": len(knowledge_file_handler.memory),
            "files": len([item for item in knowledge_file_handler.memory if item.type == "file"]),
            "folders": len([item for item in knowledge_file_handler.memory if item.type == "folder"]),
            "images": len([item for item in knowledge_file_handler.memory if item.type == "image"]),
        }
        
        # Get LLM stats using available methods
        models_info = llm_manager.get_available_models()
        
        llm_stats = {
            "default_model": llm_manager.service_config.get_default_model() or "",
            "all_models": models_info.get("all_models", []),
            "services": {
                service_id: {
                    "available": service_id in llm_manager.services and llm_manager.services[service_id].is_available(),
                    "status": "Available" if service_id in llm_manager.services and llm_manager.services[service_id].is_available() else "Offline",
                    "models": service_config.get("config", {}).get("models", [])
                }
                for service_id, service_config in llm_manager.service_config.get_services().items()
            }
        }
        
        return {
            "short_term_memory": memory_stats,
            "long_term_memory": {"total_actions": len(action_handler)},
            "llm_services": llm_stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")


@router.post("/refresh")
async def refresh_memory():
    """Refresh memory systems"""
    try:
        knowledge_file_handler.refresh()
        return {
            "message": "Memory refreshed successfully",
            "stats": {
                "short_term_items": len(knowledge_file_handler),
                "long_term_actions": len(action_handler),
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error refreshing memory: {str(e)}"
        )


@router.get("/models")
async def get_available_models():
    """Get all available LLM models with health status"""
    try:
        models_info = llm_manager.get_available_models()
        return models_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting models: {str(e)}")


@router.get("/models/{model_id}/health")
async def get_model_health(model_id: str):
    """Get health status for a specific model"""
    try:
        health_info = llm_manager.get_model_health(model_id)
        return health_info
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting model health: {str(e)}"
        )


@router.post("/models/refresh")
async def refresh_models():
    """Refresh available models list"""
    try:
        # Re-initialize the LLM manager to refresh model mappings
        llm_manager._update_model_mapping()
        models_info = llm_manager.get_available_models()
        return {"message": "Models refreshed successfully", "models": models_info}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error refreshing models: {str(e)}"
        )


@router.post("/actions/execute")
async def execute_action(request_data: dict):
    """Execute a specific action"""
    try:
        action_id = request_data.get("action_id")
        user_input = request_data.get("user_input", "")
        attachments = request_data.get("attachments", [])

        if not action_id:
            raise HTTPException(status_code=400, detail="action_id is required")

        # Prepare user input with attachments if present
        full_input = user_input
        if attachments:
            attachment_contents = []
            for att in attachments:
                att_name = att.get("name", "unknown")
                att_content = att.get("content")
                att_size = att.get("size")

                if att_content:
                    size_info = f" ({att_size} bytes)" if att_size else ""
                    attachment_contents.append(
                        f"File: {att_name}{size_info}\n{'-' * 40}\n{att_content}\n{'-' * 40}"
                    )

            if attachment_contents:
                full_input += (
                    f"\n\nAttached Files:\n{'=' * 50}\n"
                    + "\n\n".join(attachment_contents)
                    + f"\n{'=' * 50}"
                )

        # Execute the action
        result = action_handler.execute_action(action_id, full_input)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing action: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        models_info = llm_manager.get_available_models()
        return {
            "status": "healthy",
            "timestamp": "now",
            "services": {
                "ollama": models_info["services"]["ollama"]["status"],
                "openai": models_info["services"]["openai"]["status"],
            },
            "default_model": models_info["default_model"],
            "total_models": len(models_info["all_models"]),
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


# Service Configuration Endpoints
@router.post("/services/add")
async def add_service(request: ServiceConfigRequest):
    """Add a new LLM service configuration"""
    try:
        result = llm_manager.add_service(
            request.service_id, 
            request.service_type, 
            request.config
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding service: {str(e)}")


@router.delete("/services/{service_id}")
async def remove_service(service_id: str):
    """Remove a service configuration"""
    try:
        result = llm_manager.remove_service(service_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing service: {str(e)}")


@router.post("/services/test")
async def test_service(request: TestServiceRequest):
    """Test a service configuration without saving it"""
    try:
        result = llm_manager.test_service(request.service_type, request.config)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error testing service: {str(e)}")


@router.get("/services")
async def get_services():
    """Get all configured services"""
    try:
        models_info = llm_manager.get_available_models()
        return models_info["services"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting services: {str(e)}")


@router.post("/models/default")
async def set_default_model(request: SetDefaultModelRequest):
    """Set the default model"""
    try:
        result = llm_manager.set_default_model(request.model)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting default model: {str(e)}")
