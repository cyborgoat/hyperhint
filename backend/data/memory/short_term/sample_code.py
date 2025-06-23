#!/usr/bin/env python3
"""
Sample Python code for HyperHint project demonstration
"""

import asyncio
from datetime import datetime
from typing import Any, Dict, List


class MessageProcessor:
    """Process and format chat messages"""
    
    def __init__(self):
        self.messages: List[Dict[str, Any]] = []
        self.processors = {
            'text': self._process_text,
            'code': self._process_code,
            'image': self._process_image
        }
    
    def add_message(self, content: str, message_type: str = 'text') -> Dict[str, Any]:
        """Add a new message to the processor"""
        message = {
            'id': len(self.messages),
            'content': content,
            'type': message_type,
            'timestamp': datetime.now().isoformat(),
            'processed': False
        }
        
        self.messages.append(message)
        return message
    
    def _process_text(self, content: str) -> str:
        """Process plain text content"""
        # Simple text processing example
        processed = content.strip()
        if len(processed) > 100:
            processed = processed[:97] + "..."
        return processed
    
    def _process_code(self, content: str) -> str:
        """Process code content"""
        # Add syntax highlighting markers
        return f"```\n{content}\n```"
    
    def _process_image(self, content: str) -> str:
        """Process image content"""
        return f"[Image: {content}]"
    
    async def process_all(self) -> List[Dict[str, Any]]:
        """Process all pending messages"""
        processed_messages = []
        
        for message in self.messages:
            if not message['processed']:
                processor = self.processors.get(message['type'], self._process_text)
                message['content'] = processor(message['content'])
                message['processed'] = True
                
                # Simulate async processing
                await asyncio.sleep(0.1)
                
            processed_messages.append(message)
        
        return processed_messages
    
    def get_stats(self) -> Dict[str, int]:
        """Get processing statistics"""
        stats = {
            'total': len(self.messages),
            'processed': sum(1 for msg in self.messages if msg['processed']),
            'pending': sum(1 for msg in self.messages if not msg['processed'])
        }
        return stats


# Example usage
if __name__ == "__main__":
    processor = MessageProcessor()
    
    # Add sample messages
    processor.add_message("Hello, this is a test message", "text")
    processor.add_message("def hello():\n    print('Hello World')", "code")
    processor.add_message("screenshot.png", "image")
    
    # Process messages
    async def main():
        processed = await processor.process_all()
        print("Processed messages:")
        for msg in processed:
            print(f"  {msg['id']}: {msg['content'][:50]}...")
        
        print("\nStats:", processor.get_stats())
    
    asyncio.run(main()) 