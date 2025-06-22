# HyperHint Backend

A FastAPI-based backend server providing real-time file and action suggestions with WebSocket support.

*Created by cyborgoat*

## Features

- 🔍 **File System Scanning**: Automatically scans and indexes files and folders
- 🚀 **Real-time Suggestions**: WebSocket-based real-time autocompletion
- 📝 **Action Management**: Predefined actions with search capabilities
- 🔌 **REST API**: HTTP endpoints for file and action queries
- 💾 **Memory Management**: Short-term (files) and long-term (actions) memory systems
- 🔄 **Auto-refresh**: Dynamic file system monitoring

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

1. Install dependencies using uv (recommended) or pip:

```bash
# Using uv (recommended)
uv sync

# Or using pip
pip install -e .
```

## Usage

### Development Server

```bash
# Quick start
python start.py

# Or using uvicorn directly
uvicorn hyperhint.main:app --reload --host 0.0.0.0 --port 8000
```

### API Endpoints

- `GET /` - Root endpoint with API information
- `GET /health` - Health check
- `GET /api/files?q=<query>` - Search files
- `GET /api/actions?q=<query>` - Search actions
- `GET /api/stats` - Memory statistics
- `POST /api/refresh` - Refresh file system scan

### WebSocket Endpoints

- `ws://localhost:8000/ws/suggestions` - Real-time suggestions

### SSE (Server-Sent Events) Endpoints

- `POST /api/chat/stream` - Streaming chat responses
- `POST /api/chat/stop` - Stop streaming chat
- `GET /api/chat/status` - Get streaming status

### WebSocket Usage Examples

#### File Suggestions
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/suggestions');
ws.send(JSON.stringify({
  type: 'files',
  query: 'readme'
}));
```

#### Action Suggestions
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/suggestions');
ws.send(JSON.stringify({
  type: 'actions',
  query: 'create'
}));
```

### SSE Usage Examples

#### Streaming Chat
```javascript
fetch('/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Hello, how can you help me?',
    model: 'claude-4-sonnet',
    stream_id: 'unique-stream-id'
  })
}).then(response => {
  const reader = response.body.getReader();
  // Process streaming data
});
```

## Memory Systems

### Short-term Memory (Files)
- Automatically scans current working directory
- Supports files and folders
- Recursive scanning with depth limit
- File type detection (images, documents, etc.)
- Size and metadata tracking

### Long-term Memory (Actions)
- Predefined action set
- Category-based organization
- Tag-based searching
- Extensible action system

## Default Actions

- `search` - Search through files and content
- `create` - Create a new file or folder
- `edit` - Edit an existing file
- `delete` - Delete a file or folder
- `copy` - Copy files or folders
- `move` - Move or rename files
- `analyze` - Analyze file content or structure
- `summarize` - Summarize file content
- `translate` - Translate text content
- `format` - Format code or text

## Environment Variables

- `BACKEND_URL` - Backend URL for frontend integration (default: http://localhost:8000)

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