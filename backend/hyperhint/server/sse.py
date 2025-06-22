from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator, Dict, Any
import json
import asyncio
from datetime import datetime

sse_router = APIRouter()

# Store active streaming sessions for cancellation
active_streams: Dict[str, bool] = {}


async def generate_chat_stream(
    message: str, 
    attachments: list = None, 
    model: str = "claude-4-sonnet",
    stream_id: str = None
) -> AsyncGenerator[str, None]:
    """Generate streaming chat response"""
    
    # Mock streaming response - replace with actual LLM integration
    response_parts = [
        f"I received your message: '{message}'",
        f"Using model: {model}",
        f"Attachments: {len(attachments) if attachments else 0}",
        "This is a mock streaming response from the HyperHint backend.",
        "In a real implementation, this would be connected to your LLM service.",
        "Each part of this response is streamed in real-time.",
        "You can interrupt this generation at any time using the stop button."
    ]
    
    try:
        # Send initial event
        yield f"data: {json.dumps({'type': 'start', 'timestamp': datetime.now().isoformat()})}\n\n"
        
        # Stream response parts
        for i, part in enumerate(response_parts):
            # Check if stream should be cancelled
            if stream_id and not active_streams.get(stream_id, True):
                yield f"data: {json.dumps({'type': 'cancelled', 'message': 'Generation stopped by user.'})}\n\n"
                break
                
            # Simulate processing time
            await asyncio.sleep(0.5)
            
            # Send content chunk
            chunk_data = {
                'type': 'content',
                'content': part,
                'chunk_index': i,
                'timestamp': datetime.now().isoformat()
            }
            yield f"data: {json.dumps(chunk_data)}\n\n"
        
        # Send completion event if not cancelled
        if stream_id and active_streams.get(stream_id, True):
            yield f"data: {json.dumps({'type': 'complete', 'timestamp': datetime.now().isoformat()})}\n\n"
            
    except Exception as e:
        # Send error event
        error_data = {
            'type': 'error',
            'message': f'Stream error: {str(e)}',
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
        
        # Track this stream
        active_streams[stream_id] = True
        
        # Return streaming response
        return StreamingResponse(
            generate_chat_stream(message, attachments, model, stream_id),
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
        "stream_ids": list(active_streams.keys())
    } 