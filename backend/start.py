#!/usr/bin/env python3
"""
Quick start script for HyperHint backend development
"""

import os
import sys
from dotenv import load_dotenv

import uvicorn

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables from .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

if __name__ == "__main__":
    print("🚀 Starting HyperHint Backend Server...")
    print("📡 API will be available at: http://localhost:8000")
    print("📖 API docs will be available at: http://localhost:8000/docs")
    print("🔌 WebSocket endpoints:")
    print("   - Suggestions: ws://localhost:8000/ws/suggestions")
    print("   - Chat: ws://localhost:8000/ws/chat")
    print("\n" + "="*50 + "\n")
    
    # Determine if running as a PyInstaller bundled executable
    is_frozen = getattr(sys, 'frozen', False)
    
    uvicorn.run(
        "hyperhint.main:app",
        host="0.0.0.0",
        port=8000,
        reload=not is_frozen,  # Set reload to False if frozen (PyInstaller executable)
        log_level="info"
    ) 