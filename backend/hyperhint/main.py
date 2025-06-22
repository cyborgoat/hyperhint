#!/usr/bin/env python3
"""
HyperHint Backend Server
A FastAPI-based server providing real-time file and action suggestions
"""

import uvicorn
from hyperhint.server import create_app

# Create the FastAPI app
app = create_app()

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "HyperHint API is running!",
        "version": "0.1.0",
        "endpoints": {
            "files": "/api/files",
            "actions": "/api/actions",
            "stats": "/api/stats",
            "refresh": "/api/refresh",
            "websocket_suggestions": "/ws/suggestions",
            "chat_stream": "/api/chat/stream",
            "chat_stop": "/api/chat/stop",
            "chat_status": "/api/chat/status"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "hyperhint-backend"}

if __name__ == "__main__":
    uvicorn.run(
        "hyperhint.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
