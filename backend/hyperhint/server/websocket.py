import json
from typing import List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from hyperhint.memory._long_term import LongTermMem
from hyperhint.memory._short_term import ShortTermMem

websocket_router = APIRouter()

# Initialize memory instances
short_term_memory = ShortTermMem()
long_term_memory = LongTermMem()

# Store active WebSocket connections
active_connections: List[WebSocket] = []


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)


manager = ConnectionManager()


@websocket_router.websocket("/ws/suggestions")
async def websocket_suggestions(websocket: WebSocket):
    """WebSocket endpoint for real-time suggestions"""
    await manager.connect(websocket)
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                query_type = message.get("type")  # "files" or "actions"
                query = message.get("query", "")
                
                if query_type == "files":
                    suggestions = short_term_memory.search(query)
                    response = {
                        "type": "files",
                        "query": query,
                        "suggestions": [
                            {
                                "id": suggestion.id,
                                "label": suggestion.label,
                                "description": suggestion.description,
                                "metadata": suggestion.metadata
                            }
                            for suggestion in suggestions
                        ]
                    }
                elif query_type == "actions":
                    suggestions = long_term_memory.search(query)
                    response = {
                        "type": "actions",
                        "query": query,
                        "suggestions": [
                            {
                                "id": suggestion.id,
                                "label": suggestion.label,
                                "description": suggestion.description,
                                "metadata": suggestion.metadata
                            }
                            for suggestion in suggestions
                        ]
                    }
                else:
                    response = {
                        "type": "error",
                        "message": "Invalid query type. Use 'files' or 'actions'"
                    }
                
                await manager.send_personal_message(json.dumps(response), websocket)
                
            except json.JSONDecodeError:
                error_response = {
                    "type": "error",
                    "message": "Invalid JSON format"
                }
                await manager.send_personal_message(json.dumps(error_response), websocket)
            except Exception as e:
                error_response = {
                    "type": "error",
                    "message": f"Server error: {str(e)}"
                }
                await manager.send_personal_message(json.dumps(error_response), websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket) 