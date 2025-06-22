from typing import List, Optional
from hyperhint.memory._types import Action, Suggestion


class LongTermMem:
    def __init__(self):
        self.actions: List[Action] = []
        self._load_core_actions()

    def _load_core_actions(self):
        """Load core actions only"""
        core_actions = [
            Action(
                id="chat",
                label="chat",
                description="Start a conversation with the AI assistant",
                command="/chat",
                category="communication",
                tags=["talk", "conversation", "discuss"]
            ),
            Action(
                id="analyze",
                label="analyze",
                description="Analyze file content, code, or data",
                command="/analyze",
                category="analysis",
                tags=["examine", "inspect", "review", "study"]
            ),
            Action(
                id="format",
                label="format",
                description="Format code, text, or documents",
                command="/format",
                category="text",
                tags=["beautify", "style", "clean", "prettify"]
            ),
            Action(
                id="add_knowledge",
                label="add_knowledge",
                description="Save user input as knowledge to short-term memory",
                command="/add_knowledge",
                category="memory",
                tags=["save", "store", "remember", "knowledge"]
            )
        ]
        
        self.actions.extend(core_actions)

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

    def execute_action(self, action_id: str, user_input: str = "", **kwargs) -> dict:
        """Execute an action and return result"""
        action = self.get_action(action_id)
        if not action:
            return {"error": f"Action '{action_id}' not found"}
        
        try:
            if action_id == "chat":
                return {
                    "action": "chat",
                    "message": f"Starting chat conversation with: {user_input}",
                    "status": "success"
                }
            
            elif action_id == "analyze":
                return {
                    "action": "analyze", 
                    "message": f"Analyzing content: {user_input[:100]}{'...' if len(user_input) > 100 else ''}",
                    "analysis": "Content analysis would be performed here",
                    "status": "success"
                }
            
            elif action_id == "format":
                return {
                    "action": "format",
                    "message": f"Formatting content: {user_input[:50]}{'...' if len(user_input) > 50 else ''}",
                    "formatted": user_input.strip(),  # Simple formatting example
                    "status": "success"
                }
            
            elif action_id == "add_knowledge":
                # Import here to avoid circular imports
                from hyperhint.memory import short_term_memory
                
                # Generate filename based on timestamp
                from datetime import datetime
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"user_knowledge_{timestamp}.txt"
                
                # Save to short-term memory
                success = short_term_memory.add_knowledge_file(filename, user_input)
                
                if success:
                    return {
                        "action": "add_knowledge",
                        "message": f"Knowledge saved as {filename}",
                        "filename": filename,
                        "content_length": len(user_input),
                        "status": "success"
                    }
                else:
                    return {
                        "action": "add_knowledge",
                        "message": "Failed to save knowledge",
                        "status": "error"
                    }
            
            else:
                return {"error": f"Action '{action_id}' execution not implemented"}
                
        except Exception as e:
            return {
                "action": action_id,
                "error": f"Action execution failed: {str(e)}",
                "status": "error"
            }

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
        self._load_core_actions()
        
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
    