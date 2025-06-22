# HyperHint Project Overview

## Project Description
HyperHint is a modern AI-powered chat interface that combines Next.js frontend with FastAPI backend, featuring real-time streaming responses and intelligent file/action suggestions.

## Architecture

### Frontend (Next.js 15)
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Key Features**:
  - Real-time chat interface with streaming responses
  - File upload and attachment support
  - Autocomplete for files (@) and actions (/)
  - Model selection (Claude, GPT, Llama variants)
  - Responsive design with proper scrolling

### Backend (FastAPI)
- **Framework**: FastAPI with Python 3.8+
- **Features**:
  - Server-Sent Events (SSE) for streaming
  - WebSocket support for real-time suggestions
  - Memory management system
  - LLM integration (Ollama + OpenAI compatible)

## Memory System

### Short-term Memory
- Stores file references and recent context
- Located in `/data/knowledge_memory/short_term_memory/`
- Supports various file types (documents, images, code)

### Long-term Memory
- Stores available actions and commands
- Includes: chat, analyze, format, add_knowledge
- Extensible action system

## LLM Integration
- **Ollama**: Local LLM support (llama3.2, codellama, etc.)
- **OpenAI**: Cloud-based models (GPT-3.5, GPT-4)
- **Compatible APIs**: Support for OpenAI-compatible endpoints

## Development Status
- ✅ Frontend chat interface
- ✅ Backend API with SSE streaming
- ✅ Memory management system
- ✅ LLM service integration
- 🚧 Real file system integration
- 🚧 Advanced action processing

## Getting Started
1. Install dependencies: `pip install -e .` (backend), `npm install` (frontend)
2. Start backend: `python start.py`
3. Start frontend: `npm run dev`
4. Access at `http://localhost:3000` 