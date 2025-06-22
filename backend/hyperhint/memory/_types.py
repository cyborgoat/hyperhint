from datetime import datetime
from typing import Optional

from pydantic.dataclasses import dataclass


@dataclass
class Memory:
    type: str =  "file" | "url" | "text" | "folder"
    name: str
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()
    metadata: dict = {}
    content: str = ""
    url: str = ""
    file_path: str = ""
    folder_path: str = ""
    tags: list[str] = []




