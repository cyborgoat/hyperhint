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
                tags=["save", "store", "remember", "knowledge"],
            )
        ]

        self.actions.extend(core_actions)

    def search(self, query: str) -> List[Suggestion]:
        """Search for actions matching the query"""
        query_lower = query.lower()
        suggestions = []

        for action in self.actions:
            # Search in label, description, and tags
            if (
                query_lower in action.label.lower()
                or (action.description and query_lower in action.description.lower())
                or any(query_lower in tag.lower() for tag in action.tags)
            ):
                suggestion = Suggestion(
                    id=action.id,
                    label=action.label,
                    description=action.description,
                    type="action",
                    metadata={
                        "command": action.command,
                        "category": action.category,
                        "tags": action.tags,
                    },
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
                import asyncio
                import re
                from hyperhint.memory import short_term_memory
                from hyperhint.llm import llm_manager

                attachments = kwargs.get("attachments", [])
                knowledge_filename = kwargs.get("knowledge_filename")

                # Check if we have actual file attachments with content
                file_attachments = [
                    att for att in attachments 
                    if att.get("type") == "file" and att.get("content")
                ] if attachments else []

                # Generate intelligent filename using LLM
                async def generate_filename():
                    if file_attachments:
                        # Create context for filename generation
                        content_preview = ""
                        
                        # Add content preview for better context
                        for att in file_attachments[:2]:  # First 2 files for context
                            content = att.get("content", "")[:200]  # First 200 chars
                            content_preview += f"File: {att.get('name', 'unknown')}\nPreview: {content}...\n\n"
                        
                        filename_prompt = f"""Generate a short, descriptive filename (without extension) for saving this knowledge. 

Content being saved:
{content_preview}

User message: {user_input}

Requirements:
- Maximum 2-3 words
- Use underscore_case (no spaces, hyphens, or special characters)
- Be descriptive and specific
- No file extension needed

Return ONLY the filename, nothing else."""
                    else:
                        # Generate filename from text content - use first 300 chars for context
                        content_preview = user_input[:300] if user_input else "text note"
                        filename_prompt = f"""Generate a short, descriptive filename (without extension) for this text content:

Content: {content_preview}

Requirements:
- Maximum 2-3 words  
- Use underscore_case (no spaces, hyphens, or special characters)
- Be descriptive and specific
- No file extension needed

Return ONLY the filename, nothing else."""
                    
                    # Get filename from LLM
                    messages = [{"role": "user", "content": filename_prompt}]
                    filename_content = ""
                    
                    async for chunk in llm_manager.stream_chat(messages):
                        if chunk.get("type") == "content":
                            filename_content += chunk.get("content", "")
                    
                    # Clean and validate the generated filename
                    filename = filename_content.strip().lower()
                    # Remove any invalid characters and ensure it's a valid filename
                    filename = re.sub(r'[^a-z0-9_]', '', filename)
                    
                    if not filename or len(filename) < 2:
                        # Fallback to simple extraction if LLM fails
                        if user_input:
                            words = re.findall(r"\b[a-zA-Z]{3,}\b", user_input.lower())
                            filename = "_".join(words[:2]) if len(words) >= 2 else (words[0] if words else "note")
                        else:
                            filename = "knowledge_file"
                    
                    return filename

                if knowledge_filename:
                    # Use the user-provided filename and sanitize it
                    sanitized_name = re.sub(r'[^\w\s.-]', '', knowledge_filename).strip()
                    sanitized_name = re.sub(r'\s+', '_', sanitized_name)
                    if '.' not in sanitized_name:
                        filename = f"{sanitized_name}.txt"
                    else:
                        filename = sanitized_name
                else:
                    # Run async filename generation if no filename is provided
                    try:
                        filename_base = asyncio.run(generate_filename())
                        filename = f"{filename_base}.txt"
                    except Exception as e:
                        print(f"Error generating filename with LLM: {e}")
                        # Fallback to simple generation
                        if user_input:
                            words = re.findall(r"\b[a-zA-Z]{3,}\b", user_input.lower())
                            filename_base = "_".join(words[:2]) if len(words) >= 2 else (words[0] if words else "note")
                        else:
                            filename_base = "knowledge_file"
                        filename = f"{filename_base}.txt"

                # Determine content to save
                if file_attachments:
                    # Validate file sizes (5MB per file, 20MB total)
                    max_file_size = 5 * 1024 * 1024  # 5MB
                    max_total_size = 20 * 1024 * 1024  # 20MB
                    total_size = 0
                    
                    for att in file_attachments:
                        file_size = att.get("size", len(att.get("content", "").encode('utf-8')))
                        total_size += file_size
                        
                        if file_size > max_file_size:
                            return {
                                "action": "add_knowledge",
                                "message": f"File '{att.get('name', 'unknown')}' exceeds 5MB limit",
                                "status": "error",
                            }
                    
                    if total_size > max_total_size:
                        return {
                            "action": "add_knowledge", 
                            "message": f"Total files size {total_size / 1024 / 1024:.1f}MB exceeds 20MB limit",
                            "status": "error",
                        }

                    # Process each file individually with LLM analysis
                    async def analyze_files():
                        file_analyses = []
                        
                        for i, att in enumerate(file_attachments):
                            file_name = att.get("name", f"file_{i + 1}")
                            file_content = att.get("content", "")
                            file_size_kb = len(file_content.encode('utf-8')) / 1024
                            
                            # Get file extension for context
                            file_ext = file_name.split('.')[-1].lower() if '.' in file_name else 'txt'
                            
                            analysis_prompt = f"""Analyze this {file_ext} file and provide a comprehensive summary:

File: {file_name} ({file_size_kb:.1f}KB)
Content:
{file_content[:2000]}{'...' if len(file_content) > 2000 else ''}

Please provide:
1. **File Type & Purpose**: What kind of file this is and its likely purpose
2. **Key Content Summary**: Main topics, functions, or information contained
3. **Structure Analysis**: How the content is organized (if applicable)
4. **Notable Elements**: Important functions, classes, configurations, or data points
5. **Potential Use Cases**: How this file might be referenced or used

Format your response in clean markdown. Be thorough but concise."""
                            
                            messages = [{"role": "user", "content": analysis_prompt}]
                            analysis_result = ""
                            
                            async for chunk in llm_manager.stream_chat(messages):
                                if chunk.get("type") == "content":
                                    analysis_result += chunk.get("content", "")
                            
                            file_analyses.append({
                                "name": file_name,
                                "size_kb": file_size_kb,
                                "analysis": analysis_result.strip() if analysis_result.strip() else f"Analysis of {file_name}",
                                "content": file_content
                            })
                        
                        return file_analyses

                    # Run async file analysis
                    try:
                        file_analyses = asyncio.run(analyze_files())
                    except Exception as e:
                        print(f"Error analyzing files with LLM: {e}")
                        # Fallback to simple processing
                        file_analyses = [
                            {
                                "name": att.get("name", f"file_{i+1}"),
                                "size_kb": len(att.get("content", "").encode('utf-8')) / 1024,
                                "analysis": f"File: {att.get('name', 'unknown')}",
                                "content": att.get("content", "")
                            }
                            for i, att in enumerate(file_attachments)
                        ]

                    # Combine everything into structured content
                    combined_content = ""
                    
                    # Add user context
                    original_message = user_input.split("\n\nAttached Files:\n")[0] if "\n\nAttached Files:\n" in user_input else user_input
                    if original_message.strip():
                        combined_content += f"# User Context\n{original_message}\n\n"
                    
                    # Add overall summary
                    total_files = len(file_analyses)
                    total_size_mb = sum(fa["size_kb"] for fa in file_analyses) / 1024
                    combined_content += "# File Collection Summary\n\n"
                    combined_content += f"- **Total Files**: {total_files}\n"
                    combined_content += f"- **Total Size**: {total_size_mb:.2f}MB\n"
                    combined_content += f"- **File Types**: {', '.join(set(fa['name'].split('.')[-1] for fa in file_analyses if '.' in fa['name']))}\n\n"
                    
                    # Add each file's detailed analysis
                    for i, fa in enumerate(file_analyses):
                        combined_content += f"{'='*80}\n"
                        combined_content += f"## File {i+1}: {fa['name']} ({fa['size_kb']:.1f}KB)\n\n"
                        combined_content += f"{fa['analysis']}\n\n"
                        combined_content += f"### Original Content\n```\n{fa['content']}\n```\n\n"
                    
                    combined_content += f"{'='*80}\n"
                    combined_content += f"*Knowledge base entry created with {total_files} files analyzed by AI*"

                    content_to_save = combined_content
                else:
                    # No file attachments - save the user's text input with LLM summarization
                    # Clean up any formatted attachment info that might be in user_input
                    clean_input = user_input.split("\n\nAttached Files:\n")[0] if "\n\nAttached Files:\n" in user_input else user_input
                    original_text = clean_input.strip()
                    
                    # Use LLM to summarize and enhance the plain text content
                    async def summarize_content():
                        if len(original_text) > 100:  # Only summarize if text is substantial
                            summary_prompt = f"""Please create a well-structured summary and expansion of this text content:

Original text:
{original_text}

Please provide:
1. A clear, organized summary
2. Key points or insights extracted
3. Any relevant context or implications

Format the output in markdown for better readability. Keep it comprehensive but concise."""
                            
                            messages = [{"role": "user", "content": summary_prompt}]
                            summarized_content = ""
                            
                            async for chunk in llm_manager.stream_chat(messages):
                                if chunk.get("type") == "content":
                                    summarized_content += chunk.get("content", "")
                            
                            if summarized_content.strip():
                                return f"# User Input Summary\n\n## Original Text\n{original_text}\n\n## AI Summary & Analysis\n{summarized_content.strip()}"
                            else:
                                return original_text
                        else:
                            return original_text
                    
                    # Run async summarization
                    try:
                        content_to_save = asyncio.run(summarize_content())
                    except Exception as e:
                        print(f"Error summarizing content with LLM: {e}")
                        content_to_save = original_text

                # Save the content
                actual_filename = short_term_memory.add_knowledge_file(filename, content_to_save)

                if actual_filename:
                    if file_attachments:
                        return {
                            "action": "add_knowledge",
                            "message": f"Files saved as {actual_filename}",
                            "filename": actual_filename,
                            "status": "success",
                        }
                    else:
                        return {
                            "action": "add_knowledge", 
                            "message": f"Note saved as {actual_filename}",
                            "filename": actual_filename,
                            "status": "success",
                        }
                else:
                    return {
                        "action": "add_knowledge",
                        "message": "Failed to save content",
                        "status": "error",
                    }

            else:
                return {"error": f"Action '{action_id}' execution not implemented"}

        except Exception as e:
            return {
                "action": action_id,
                "error": f"Action execution failed: {str(e)}",
                "status": "error",
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
