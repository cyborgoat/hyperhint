# HyperHint Backend

A FastAPI-based backend server providing multi-LLM chat streaming, real-time suggestions, and an intelligent, action-driven architecture.

*Created by cyborgoat*

## Features

- 🚀 **Configurable LLM Services**: Supports Ollama, OpenAI, and any OpenAI-compatible endpoints.
    -   **Ollama**: Automatically discovers and lists models.
    -   **OpenAI & Compatible Endpoints**: Requires explicit model configuration.
    -   **Service Management**: Endpoints to add, remove, and test LLM services, ensuring a "clean slate" approach with no default assumptions.
- ⚡ **Action-Driven System**: Extensible actions like `/add_knowledge` orchestrate complex workflows involving LLMs and file system operations.
- 🧠 **AI-Powered Services**: Includes endpoints for on-the-fly filename generation from file content.
- 💾 **Intelligent Memory**:
    - **Short-Term Memory**: Manages a knowledge base of text and code files in the `data/memory/short_term` directory.
    - **Long-Term Memory**: Defines the available actions and their capabilities.
- 🔄 **Real-time Engine**:
    - **Server-Sent Events (SSE)**: For streaming LLM responses and action-related events.
    - **WebSockets**: For providing real-time file and action suggestions as the user types.

## Architecture

```
backend/
├── hyperhint/
│   ├── main.py              # FastAPI app entry point
│   ├── memory/              # Memory management modules
│   │   ├── _types.py        # Pydantic models and types
│   │   ├── _short_term.py   # File system memory
│   │   └── _long_term.py    # Action memory
│   └── server/              # FastAPI server modules
│       ├── __init__.py      # App factory
│       ├── routes.py        # REST API endpoints
│       └── websocket.py     # WebSocket handlers
├── pyproject.toml           # Project dependencies
└── start.py                 # Development server script
```

## Installation

1. Create a virtual environment and install dependencies:
```bash
# Using uv (recommended)
uv venv
uv sync

# Or using pip
python -m venv .venv
pip install -e .
```
2.  Set up your environment variables by copying `.env.example` to `.env` and configuring your models.

## Usage

### Development Server
```bash
python start.py
```
The server will run on `http://localhost:8000`.

### API Endpoints

-   `POST /api/chat/stream`: The main endpoint for handling chat messages and executing actions via an SSE stream.
-   `POST /api/generate-filename`: Generates a descriptive filename from file content previews.
-   `GET /api/files?q=<query>`: Searches for files in the short-term memory.
-   `GET /api/actions?q=<query>`: Searches for available actions.
-   `GET /api/models`: Lists all available LLM models and their status.
-   `GET /health`: A simple health check endpoint.

### WebSocket Endpoint

-   `ws://localhost:8000/ws/suggestions`: Provides real-time file and action suggestions.

## Memory Systems

### Short-term Memory (Files)
-   Automatically scans the `data/memory/short_term` directory.
-   The `/add_knowledge` action saves new text files and AI-powered summaries here.
-   Files in this directory can be referenced in the chat with the `@` symbol.

### Long-term Memory (Actions)
-   Defines the core capabilities of the assistant.
-   Currently focused on the `/add_knowledge` action but is designed to be easily extended.

## Environment Variables
The backend is configured through a `.env` file. Key variables include `DEFAULT_MODEL`, `OLLAMA_HOST`, `OPENAI_API_KEY`, and model lists like `OPENAI_MODELS`. See the main project `README.md` for full details.

## Development

The backend is designed with modularity in mind:

- **Memory modules** handle data storage and retrieval
- **Server modules** handle HTTP and WebSocket communication
- **Type definitions** ensure data consistency
- **Automatic file scanning** keeps suggestions up-to-date

## Integration

The backend integrates seamlessly with the Next.js frontend through:
- REST API proxy endpoints
- CORS-enabled requests
- Fallback mechanisms for offline operation
- Real-time WebSocket communication 