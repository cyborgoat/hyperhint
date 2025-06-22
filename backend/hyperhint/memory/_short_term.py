from typing import List, Optional

from hyperhint.memory._types import Memory, Suggestion


class ShortTermMem:
    def __init__(self):
        self.memory: List[Memory] = []
        self._load_mock_data()

    def _load_mock_data(self):
        """Load mock files and folders for demonstration"""
        mock_items = [
            # Mock files
            Memory(
                type="file",
                name="README.md",
                file_path="./README.md",
                size=2048,
                metadata={"extension": ".md", "parent_dir": ".", "is_hidden": False}
            ),
            Memory(
                type="file",
                name="package.json",
                file_path="./package.json",
                size=1024,
                metadata={"extension": ".json", "parent_dir": ".", "is_hidden": False}
            ),
            Memory(
                type="file",
                name="main.py",
                file_path="./src/main.py",
                size=4096,
                metadata={"extension": ".py", "parent_dir": "./src", "is_hidden": False}
            ),
            Memory(
                type="file",
                name="config.yaml",
                file_path="./config/config.yaml",
                size=512,
                metadata={"extension": ".yaml", "parent_dir": "./config", "is_hidden": False}
            ),
            Memory(
                type="file",
                name="app.tsx",
                file_path="./frontend/src/app.tsx",
                size=3072,
                metadata={"extension": ".tsx", "parent_dir": "./frontend/src", "is_hidden": False}
            ),
            # Mock images
            Memory(
                type="image",
                name="logo.png",
                file_path="./assets/logo.png",
                size=8192,
                metadata={"extension": ".png", "parent_dir": "./assets", "is_hidden": False}
            ),
            Memory(
                type="image",
                name="screenshot.jpg",
                file_path="./docs/screenshot.jpg",
                size=16384,
                metadata={"extension": ".jpg", "parent_dir": "./docs", "is_hidden": False}
            ),
            # Mock folders
            Memory(
                type="folder",
                name="src",
                folder_path="./src",
                metadata={"parent_dir": ".", "is_hidden": False}
            ),
            Memory(
                type="folder",
                name="frontend",
                folder_path="./frontend",
                metadata={"parent_dir": ".", "is_hidden": False}
            ),
            Memory(
                type="folder",
                name="backend",
                folder_path="./backend",
                metadata={"parent_dir": ".", "is_hidden": False}
            ),
            Memory(
                type="folder",
                name="assets",
                folder_path="./assets",
                metadata={"parent_dir": ".", "is_hidden": False}
            ),
            Memory(
                type="folder",
                name="docs",
                folder_path="./docs",
                metadata={"parent_dir": ".", "is_hidden": False}
            ),
            Memory(
                type="folder",
                name="config",
                folder_path="./config",
                metadata={"parent_dir": ".", "is_hidden": False}
            ),
        ]
        
        self.memory.extend(mock_items)

    def search(self, query: str) -> List[Suggestion]:
        """Search for files/folders matching the query"""
        query_lower = query.lower()
        suggestions = []
        
        for item in self.memory:
            if query_lower in item.name.lower():
                suggestion = Suggestion(
                    id=f"file_{len(suggestions)}",
                    label=item.name,
                    description=f"{item.type.title()}: {item.file_path or item.folder_path}",
                    type="file",
                    metadata={
                        "type": item.type,
                        "path": item.file_path or item.folder_path,
                        "size": item.size
                    }
                )
                suggestions.append(suggestion)
        
        return suggestions[:10]  # Limit to 10 suggestions

    def add(self, item: Memory):
        self.memory.append(item)

    def get(self, index: int) -> Memory:
        return self.memory[index]
    
    def find_by_name(self, name: str) -> Optional[Memory]:
        """Find memory item by name"""
        for item in self.memory:
            if item.name == name:
                return item
        return None
    
    def clear(self):
        self.memory = []
        
    def refresh(self):
        """Refresh the mock data"""
        self.clear()
        self._load_mock_data()
        
    def __str__(self):
        return str(self.memory)
    
    def __repr__(self):
        return f"[ShortTermMem]: ({len(self.memory)} items)"
    
    def __len__(self):
        return len(self.memory)
    
    def __getitem__(self, index: int):
        return self.memory[index]
    
    def __setitem__(self, index: int, value: Memory):
        self.memory[index] = value
    
    def __delitem__(self, index: int):
        del self.memory[index]
    
    def __iter__(self):
        return iter(self.memory)
    
    def __contains__(self, item: Memory):
        return item in self.memory
    