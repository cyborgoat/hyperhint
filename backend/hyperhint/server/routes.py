from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from hyperhint.memory._short_term import ShortTermMem
from hyperhint.memory._long_term import LongTermMem
from hyperhint.memory._types import Suggestion

router = APIRouter()

# Initialize memory instances
short_term_memory = ShortTermMem()
long_term_memory = LongTermMem()


@router.get("/files", response_model=dict)
async def get_files(q: str = Query("", description="Search query for files")):
    """Get file suggestions based on search query"""
    try:
        suggestions = short_term_memory.search(q)
        return {
            "files": [
                {
                    "id": suggestion.id,
                    "label": suggestion.label,
                    "description": suggestion.description
                }
                for suggestion in suggestions
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching files: {str(e)}")


@router.get("/actions", response_model=dict)
async def get_actions(q: str = Query("", description="Search query for actions")):
    """Get action suggestions based on search query"""
    try:
        suggestions = long_term_memory.search(q)
        return {
            "actions": [
                {
                    "id": suggestion.id,
                    "label": suggestion.label,
                    "description": suggestion.description
                }
                for suggestion in suggestions
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching actions: {str(e)}")


@router.post("/refresh")
async def refresh_files():
    """Refresh the file system scan"""
    try:
        short_term_memory.refresh()
        return {"message": "File system refreshed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing files: {str(e)}")


@router.get("/stats")
async def get_stats():
    """Get memory statistics"""
    return {
        "files_count": len(short_term_memory),
        "actions_count": len(long_term_memory),
        "memory_info": {
            "short_term": repr(short_term_memory),
            "long_term": repr(long_term_memory)
        }
    } 