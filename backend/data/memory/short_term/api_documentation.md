# HyperHint API Documentation

## Base URL
- **Development**: `http://localhost:8000`
- **Production**: TBD

## Authentication
Currently no authentication required for development.

## Endpoints

### Chat Streaming
**POST** `/api/chat/stream`

Stream chat responses using Server-Sent Events.

**Request Body:**
```json
{
  "message": "Hello, how are you?",
  "attachments": [],
  "model": "claude-4-sonnet",
  "stream_id": "stream_123456"
}
```

**Response:** SSE stream with events:
- `start`: Stream initialization
- `content`: Streaming content chunks
- `complete`: Stream completion
- `error`: Error occurred
- `cancelled`: Stream cancelled by user

### Stop Streaming
**POST** `/api/chat/stop`

Stop an active streaming session.

**Request Body:**
```json
{
  "stream_id": "stream_123456"
}
```

### File Suggestions
**GET** `/api/files?q={query}`

Get file suggestions for autocomplete.

**Parameters:**
- `q` (string): Search query

**Response:**
```json
[
  {
    "id": "file_0",
    "label": "project_overview.md",
    "description": "File: ./data/knowledge_memory/short_term_memory/project_overview.md",
    "type": "file",
    "metadata": {
      "type": "file",
      "path": "./data/knowledge_memory/short_term_memory/project_overview.md",
      "size": 2048
    }
  }
]
```

### Action Suggestions
**GET** `/api/actions?q={query}`

Get action suggestions for autocomplete.

**Parameters:**
- `q` (string): Search query

**Response:**
```json
[
  {
    "id": "chat",
    "label": "chat",
    "description": "Start a conversation with the AI assistant",
    "type": "action",
    "metadata": {
      "command": "/chat",
      "category": "communication",
      "tags": ["talk", "conversation"]
    }
  }
]
```

### System Stats
**GET** `/api/stats`

Get system statistics.

**Response:**
```json
{
  "short_term_memory": {
    "total_items": 15,
    "files": 8,
    "folders": 7
  },
  "long_term_memory": {
    "total_actions": 4
  },
  "llm_services": {
    "ollama": {
      "available": true,
      "models": ["llama3.2", "codellama"]
    },
    "openai": {
      "available": false,
      "models": []
    }
  }
}
```

### Refresh Memory
**POST** `/api/refresh`

Refresh the memory systems.

**Response:**
```json
{
  "message": "Memory refreshed successfully",
  "stats": {
    "short_term_items": 15,
    "long_term_actions": 4
  }
}
```

## WebSocket Endpoints

### Suggestions WebSocket
**WS** `/ws/suggestions`

Real-time suggestions for files and actions.

**Message Format:**
```json
{
  "type": "file_search",
  "query": "project"
}
```

**Response:**
```json
{
  "type": "suggestions",
  "data": [...]
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad Request
- `404`: Not Found
- `500`: Internal Server Error

Error responses include:
```json
{
  "error": "Error message",
  "detail": "Detailed error information"
}
``` 