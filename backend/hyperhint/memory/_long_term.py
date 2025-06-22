from typing import List, Optional
from hyperhint.memory._types import Action, Suggestion


class LongTermMem:
    def __init__(self):
        self.actions: List[Action] = []
        self._load_default_actions()

    def _load_default_actions(self):
        """Load default actions"""
        default_actions = [
            Action(
                id="search",
                label="search",
                description="Search through files and content",
                command="/search",
                category="navigation",
                tags=["find", "locate", "search"]
            ),
            Action(
                id="create",
                label="create",
                description="Create a new file or folder",
                command="/create",
                category="file",
                tags=["new", "make", "generate"]
            ),
            Action(
                id="edit",
                label="edit",
                description="Edit an existing file",
                command="/edit",
                category="file",
                tags=["modify", "change", "update"]
            ),
            Action(
                id="delete",
                label="delete",
                description="Delete a file or folder",
                command="/delete",
                category="file",
                tags=["remove", "trash", "del"]
            ),
            Action(
                id="copy",
                label="copy",
                description="Copy files or folders",
                command="/copy",
                category="file",
                tags=["duplicate", "cp"]
            ),
            Action(
                id="move",
                label="move",
                description="Move or rename files",
                command="/move",
                category="file",
                tags=["rename", "mv", "relocate"]
            ),
            Action(
                id="analyze",
                label="analyze",
                description="Analyze file content or structure",
                command="/analyze",
                category="analysis",
                tags=["examine", "inspect", "review"]
            ),
            Action(
                id="summarize",
                label="summarize",
                description="Summarize file content",
                command="/summarize",
                category="analysis",
                tags=["summary", "brief", "overview"]
            ),
            Action(
                id="translate",
                label="translate",
                description="Translate text content",
                command="/translate",
                category="text",
                tags=["language", "convert"]
            ),
            Action(
                id="format",
                label="format",
                description="Format code or text",
                command="/format",
                category="text",
                tags=["beautify", "style", "clean"]
            )
        ]
        
        self.actions.extend(default_actions)

    def search(self, query: str) -> List[Suggestion]:
        """Search for actions matching the query"""
        query_lower = query.lower()
        suggestions = []
        
        for action in self.actions:
            # Search in label, description, and tags
            if (query_lower in action.label.lower() or
                (action.description and query_lower in action.description.lower()) or
                any(query_lower in tag.lower() for tag in action.tags)):
                
                suggestion = Suggestion(
                    id=action.id,
                    label=action.label,
                    description=action.description,
                    type="action",
                    metadata={
                        "command": action.command,
                        "category": action.category,
                        "tags": action.tags
                    }
                )
                suggestions.append(suggestion)
        
        return suggestions[:10]  # Limit to 10 suggestions

    def add_action(self, action: Action):
        """Add a new action"""
        self.actions.append(action)

    def get_action(self, action_id: str) -> Optional[Action]:
        """Get action by ID"""
        for action in self.actions:
            if action.id == action_id:
                return action
        return None
    
    def get_actions_by_category(self, category: str) -> List[Action]:
        """Get all actions in a specific category"""
        return [action for action in self.actions if action.category == category]
    
    def clear(self):
        self.actions = []
        self._load_default_actions()
        
    def __str__(self):
        return str(self.actions)
    
    def __repr__(self):
        return f"[LongTermMem]: {len(self.actions)} actions"
    
    def __len__(self):
        return len(self.actions)
    
    def __getitem__(self, index: int):
        return self.actions[index]
    
    def __setitem__(self, index: int, value: Action):
        self.actions[index] = value
    
    def __delitem__(self, index: int):
        del self.actions[index]
    
    def __iter__(self):
        return iter(self.actions)
    
    def __contains__(self, item: Action):
        return item in self.actions
    