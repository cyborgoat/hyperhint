from typing import List, Optional
from hyperhint.memory._types import Action, Suggestion


class LongTermMem:
    def __init__(self):
        self.actions: List[Action] = []
        self._load_core_actions()

    def _load_core_actions(self):
        """Load core actions - only add_knowledge"""
        core_actions = [
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
            if action_id == "add_knowledge":
                from hyperhint.memory import short_term_memory
                import re
                
                attachments = kwargs.get('attachments', [])
                
                # If there are file attachments, combine them into a single knowledge file
                if attachments:
                    file_attachments = [att for att in attachments if att.get('type') == 'file' and att.get('content')]
                    
                    if file_attachments:
                        # Generate smart filename based on user input or file content
                        if user_input.strip():
                            # Use user input to generate filename
                            words = re.findall(r'\b[a-zA-Z]{3,}\b', user_input.lower())
                            if len(words) >= 2:
                                filename = f"{words[0]}_{words[1]}.txt"
                            elif len(words) == 1:
                                filename = f"{words[0]}.txt"
                            else:
                                filename = "uploaded_files.txt"
                        else:
                            # Generate filename from file content or names
                            if len(file_attachments) == 1:
                                original_name = file_attachments[0].get('name', 'uploaded_file.txt')
                                # Extract meaningful words from filename
                                base_name = original_name.split('.')[0] if '.' in original_name else original_name
                                words = re.findall(r'\b[a-zA-Z]{3,}\b', base_name.lower())
                                if words:
                                    filename = f"{words[0]}.txt"
                                else:
                                    filename = "uploaded_file.txt"
                            else:
                                filename = "multiple_files.txt"
                        
                        # Combine all file contents
                        combined_content = ""
                        
                        # Add user message as context if provided
                        if user_input.strip():
                            combined_content += f"User note: {user_input}\n\n" + "=" * 50 + "\n\n"
                        
                        # Add each file's content
                        for i, att in enumerate(file_attachments):
                            file_name = att.get('name', f'file_{i+1}')
                            file_content = att.get('content', '')
                            
                            if len(file_attachments) > 1:
                                combined_content += f"File: {file_name}\n" + "-" * 40 + "\n"
                            
                            combined_content += file_content
                            
                            if i < len(file_attachments) - 1:
                                combined_content += "\n\n" + "=" * 50 + "\n\n"
                        
                        # Save the combined content
                        actual_filename = short_term_memory.add_knowledge_file(filename, combined_content)
                        
                        if actual_filename:
                            return {
                                "action": "add_knowledge",
                                "message": f"File saved as {actual_filename}",
                                "filename": actual_filename,
                                "status": "success"
                            }
                        else:
                            return {"action": "add_knowledge", "message": "Failed to save attachments", "status": "error"}
                    else:
                        return {"action": "add_knowledge", "message": "No valid file attachments found", "status": "error"}
                
                else:
                    # No attachments, save user input as text
                    # Simple filename generation from first few words
                    words = re.findall(r'\b[a-zA-Z]{3,}\b', user_input.lower())
                    if len(words) >= 2:
                        filename = f"{words[0]}_{words[1]}.txt"
                    elif len(words) == 1:
                        filename = f"{words[0]}.txt"
                    else:
                        filename = "note.txt"
                    
                    # Save to memory
                    actual_filename = short_term_memory.add_knowledge_file(filename, user_input)
                    
                    if actual_filename:
                        return {
                            "action": "add_knowledge",
                            "message": f"Note saved as {actual_filename}",
                            "filename": actual_filename,
                            "status": "success"
                        }
                    else:
                        return {"action": "add_knowledge", "message": "Failed to save note", "status": "error"}
            
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
    