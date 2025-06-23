from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from hyperhint.llm import llm_manager
from hyperhint.memory import long_term_memory, short_term_memory

router = APIRouter()


class FilenameRequest(BaseModel):
    previews: str


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
    filename = filename_content.strip().lower().replace(' ', '_')
    filename = re.sub(r'[^a-z0-9_]', '', filename)
    filename = re.sub(r'__+', '_', filename)
    
    if not filename:
        filename = "knowledge_file"
        
    return {"filename": filename}


@router.get("/files")
async def get_file_suggestions(q: str = Query("", description="Search query")):
    """Get file suggestions for autocomplete"""
    try:
        suggestions = short_term_memory.search(q)
        return [suggestion.model_dump() for suggestion in suggestions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching files: {str(e)}")


@router.get("/actions")
async def get_action_suggestions(q: str = Query("", description="Search query")):
    """Get action suggestions for autocomplete"""
    try:
        suggestions = long_term_memory.search(q)
        return [suggestion.model_dump() for suggestion in suggestions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching actions: {str(e)}")


@router.get("/stats")
async def get_stats():
    """Get system statistics"""
    try:
        return {
            "short_term_memory": {
                "total_items": len(short_term_memory),
                "files": len([item for item in short_term_memory if item.type == "file"]),
                "folders": len([item for item in short_term_memory if item.type == "folder"]),
                "images": len([item for item in short_term_memory if item.type == "image"])
            },
            "long_term_memory": {
                "total_actions": len(long_term_memory)
            },
            "llm_services": llm_manager.get_available_models()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")


@router.post("/refresh")
async def refresh_memory():
    """Refresh memory systems"""
    try:
        short_term_memory.refresh()
        return {
            "message": "Memory refreshed successfully",
            "stats": {
                "short_term_items": len(short_term_memory),
                "long_term_actions": len(long_term_memory)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing memory: {str(e)}")


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
        raise HTTPException(status_code=500, detail=f"Error getting model health: {str(e)}")


@router.post("/models/refresh")
async def refresh_models():
    """Refresh available models list"""
    try:
        # Re-initialize the LLM manager to refresh model mappings
        llm_manager._update_model_mapping()
        models_info = llm_manager.get_available_models()
        return {
            "message": "Models refreshed successfully",
            "models": models_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing models: {str(e)}")


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
                att_name = att.get('name', 'unknown')
                att_content = att.get('content')
                att_size = att.get('size')
                
                if att_content:
                    size_info = f" ({att_size} bytes)" if att_size else ""
                    attachment_contents.append(f"File: {att_name}{size_info}\n{'-' * 40}\n{att_content}\n{'-' * 40}")
            
            if attachment_contents:
                full_input += f"\n\nAttached Files:\n{'=' * 50}\n" + "\n\n".join(attachment_contents) + f"\n{'=' * 50}"
        
        # Execute the action
        result = long_term_memory.execute_action(action_id, full_input)
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
                "openai": models_info["services"]["openai"]["status"]
            },
            "default_model": models_info["default_model"],
            "total_models": len(models_info["all_models"])
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        } 