import asyncio
import json
from datetime import datetime
from typing import AsyncGenerator, Dict

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

# Import the LLM manager and memory
from hyperhint.llm import llm_manager
from hyperhint.memory import short_term_memory

sse_router = APIRouter()

# Store active streaming sessions for cancellation
active_streams: Dict[str, bool] = {}


async def generate_chat_stream(
    message: str, 
    attachments: list = None, 
    model: str = None,
    stream_id: str = None,
    selected_action: str = None
) -> AsyncGenerator[str, None]:
    """Generate streaming chat response using real LLM services"""
    
    try:
        # Check if an action should be executed first
        if selected_action:
            # Import here to avoid circular imports
            from hyperhint.memory import long_term_memory

            # Send action execution start event
            yield f"data: {json.dumps({'type': 'action_start', 'action': selected_action, 'timestamp': datetime.now().isoformat()})}\n\n"
            
            # Execute the action with attachments
            action_result = long_term_memory.execute_action(selected_action, message, attachments=attachments)
            
            # Send action completion event
            yield f"data: {json.dumps({'type': 'action_complete', 'action': selected_action, 'result': action_result, 'timestamp': datetime.now().isoformat()})}\n\n"
            
            # For add_knowledge, create a smart summary without LLM
            if selected_action == "add_knowledge":
                if action_result.get("status") == "success":
                    # Create brief summary based on content
                    if attachments:
                        filename = action_result.get("filename", "unknown")
                        file_count = len([att for att in attachments if att.get('type') == 'file'])
                        
                        # Brief summary for file uploads
                        if file_count == 1:
                            summary_content = f"📄 **File saved as {filename}**\n\n💡 You can reference it using @{filename}"
                        else:
                            summary_content = f"📄 **{file_count} files combined and saved as {filename}**\n\n💡 You can reference it using @{filename}"
                        
                        # Send the summary as content
                        yield f"data: {json.dumps({'type': 'content', 'content': summary_content, 'timestamp': datetime.now().isoformat()})}\n\n"
                    else:
                        # Brief text note summary
                        filename = action_result.get("filename", "unknown")
                        
                        summary_content = f"📝 **File saved as {filename}**\n\n💡 You can reference it using @{filename}"
                        
                        yield f"data: {json.dumps({'type': 'content', 'content': summary_content, 'timestamp': datetime.now().isoformat()})}\n\n"
                    
                    # Send completion
                    yield f"data: {json.dumps({'type': 'complete', 'timestamp': datetime.now().isoformat()})}\n\n"
                    return
                else:
                    # Action failed, just send completion
                    yield f"data: {json.dumps({'type': 'complete', 'timestamp': datetime.now().isoformat()})}\n\n"
                    return
            
            # For other actions, generate a brief summary
            summary_prompt = f"""Action "{selected_action}" completed. Result: {action_result.get("message", "Done")}. Be brief."""
            messages = [{"role": "user", "content": summary_prompt}]
            
        else:
            # Normal chat flow - prepare messages for LLM
            messages = [{"role": "user", "content": message}]
            
            # Add attachment information and content to context if present
            if attachments:
                attachment_contents = []
                for att in attachments:
                    att_name = att.get('name', 'unknown')
                    att_type = att.get('type', 'file')
                    att_content = att.get('content')
                    att_size = att.get('size')
                    
                    if att_type == 'file':
                        if att_content:
                            # Use uploaded file content directly
                            size_info = f" ({att_size} bytes)" if att_size else ""
                            attachment_contents.append(f"File: {att_name}{size_info}\n{'-' * 40}\n{att_content}\n{'-' * 40}")
                        else:
                            # Try to read file content from memory as fallback
                            memory_item = short_term_memory.find_by_name(att_name)
                            if memory_item and memory_item.file_path:
                                file_content = short_term_memory.read_file_content(memory_item.file_path)
                                if file_content:
                                    attachment_contents.append(f"File: {att_name} (from memory)\n{'-' * 40}\n{file_content}\n{'-' * 40}")
                                else:
                                    attachment_contents.append(f"File: {att_name} (content not available)")
                            else:
                                attachment_contents.append(f"File: {att_name} (content not available)")
                    else:
                        attachment_contents.append(f"Attachment: {att_name} ({att_type})")
                
                if attachment_contents:
                    attachment_info = f"\n\nUploaded Files:\n{'=' * 50}\n" + "\n\n".join(attachment_contents) + f"\n{'=' * 50}"
                    messages[0]["content"] += attachment_info
        
        # Stream from LLM manager
        async for chunk in llm_manager.stream_chat(messages, model, stream_id):
            # Check if stream should be cancelled
            if stream_id and not active_streams.get(stream_id, True):
                yield f"data: {json.dumps({'type': 'cancelled', 'message': 'Generation stopped by user.'})}\n\n"
                break
            
            # Forward the chunk from LLM manager
            yield f"data: {json.dumps(chunk)}\n\n"
            
            # Small delay for better UX
            await asyncio.sleep(0.01)
            
    except Exception as e:
        # Send error event
        error_data = {
            'type': 'error',
            'message': f'LLM service error: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }
        yield f"data: {json.dumps(error_data)}\n\n"
    
    finally:
        # Clean up stream tracking
        if stream_id and stream_id in active_streams:
            del active_streams[stream_id]


@sse_router.post("/chat/stream")
async def stream_chat(request: Request):
    """SSE endpoint for streaming chat responses"""
    try:
        # Parse request body
        body = await request.json()
        message = body.get("message", "")
        attachments = body.get("attachments", [])
        model = body.get("model", "claude-4-sonnet")
        stream_id = body.get("stream_id", f"stream_{datetime.now().timestamp()}")
        selected_action = body.get("selected_action")  # New parameter for action execution
        
        # Track this stream
        active_streams[stream_id] = True
        
        # Return streaming response
        return StreamingResponse(
            generate_chat_stream(message, attachments, model, stream_id, selected_action),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "*",
            }
        )
        
    except Exception as e:
        return StreamingResponse(
            iter([f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"]),
            media_type="text/event-stream"
        )


@sse_router.post("/chat/stop")
async def stop_chat_stream(request: Request):
    """Stop a streaming chat session"""
    try:
        body = await request.json()
        stream_id = body.get("stream_id")
        
        if stream_id and stream_id in active_streams:
            active_streams[stream_id] = False
            return {"message": "Stream stopped successfully", "stream_id": stream_id}
        else:
            return {"message": "Stream not found or already stopped", "stream_id": stream_id}
            
    except Exception as e:
        return {"error": f"Failed to stop stream: {str(e)}"}


@sse_router.get("/chat/status")
async def get_stream_status():
    """Get status of active streams"""
    return {
        "active_streams": len(active_streams),
        "stream_ids": list(active_streams.keys()),
        "llm_status": {
            "available_models": llm_manager.get_available_models(),
            "ollama_available": llm_manager.ollama.is_available(),
            "openai_available": llm_manager.openai.is_available()
        }
    } 