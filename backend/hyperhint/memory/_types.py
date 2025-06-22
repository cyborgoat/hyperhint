from datetime import datetime
from typing import Optional, List, Literal, Dict, Any
from pydantic import BaseModel, Field


class Memory(BaseModel):
    type: Literal["file", "url", "text", "folder", "image"] = "file"
    name: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    content: str = ""
    url: str = ""
    file_path: str = ""
    folder_path: str = ""
    tags: List[str] = Field(default_factory=list)
    size: Optional[int] = None
    description: Optional[str] = None


class Action(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    command: str
    category: str = "general"
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)


class Suggestion(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    type: Literal["file", "action"] = "file"
    metadata: Dict[str, Any] = Field(default_factory=dict)




