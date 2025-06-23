# HyperHint 🚀

An intelligent, action-driven AI chat interface with a multi-LLM backend, real-time suggestions, and a powerful knowledge management system.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.13-blue)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Latest-3178C6)](https://www.typescriptlang.org/)

## 🌟 Overview

HyperHint is a modern, full-stack AI chat application that combines the power of Large Language Models with an intelligent, action-driven workflow. Built with Next.js 15 and FastAPI, it provides a seamless chat experience where users can not only talk to an AI but also command it to perform complex tasks like analyzing and saving files to a persistent knowledge base.

### ✨ Key Features

-   🤖 **Multi-LLM Backend**: Supports Ollama, OpenAI, and any OpenAI-compatible endpoints, all configurable via `.env`.
-   ⚡ **Action-Driven System**: Use `/` to trigger actions like `/add_knowledge`, which orchestrate multi-step workflows.
-   🧠 **Interactive Knowledge Base**:
    -   Use `/add_knowledge` with text or file attachments to build a knowledge base.
    -   The system prompts for a filename and can even suggest one with AI.
    -   Saved knowledge is automatically analyzed and summarized by an LLM.
-   📁 **Smart File Integration**: Reference saved knowledge with `@` for context-aware conversations.
-   🔒 **File Validation**: Enforces client-side checks for file type (text/code) and size (5MB per file, 20MB total).
-   🔄 **Real-time Streaming**: Server-Sent Events (SSE) for smooth, token-by-token chat and action responses.
-   🎨 **Modern UI**: A clean, responsive interface built with Tailwind CSS and shadcn/ui.

## 🏗️ Architecture

```
hyperhint/
├── frontend/                 # Next.js 15 + TypeScript
│   ├── src/
│   │   ├── app/             # App Router pages and API proxies
│   │   ├── components/      # React components (Chat, Input, etc.)
│   │   └── lib/             # Utilities and helpers
│   └── package.json         # Frontend dependencies
├── backend/                  # FastAPI + Python
│   ├── hyperhint/
│   │   ├── llm/             # LLM integrations (Ollama, OpenAI)
│   │   ├── memory/          # Short-term (files) & long-term (actions) memory
│   │   └── server/          # API routes, SSE, and WebSocket handlers
│   ├── data/memory/short_term/ # Knowledge base storage
│   ├── pyproject.toml       # Python dependencies
│   └── .env                 # Environment configuration
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites

-   **Node.js** 18+ and npm
-   **Python** 3.10+
-   **uv** package manager (recommended for Python)
-   **Ollama** (optional, for running local LLMs)

### 1. Clone the Repository

```bash
git clone https://github.com/cyborgoat/hyperhint.git
cd hyperhint
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment and install dependencies
uv venv
uv sync

# Set up environment variables
cp .env.example .env
# Edit .env with your LLM configuration
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

### 4. Run Both Servers

-   **Start Backend**: In the `backend` directory, run:
    ```bash
    source .venv/bin/activate  # On Windows: .venv\Scripts\activate
    python start.py
    ```
-   **Start Frontend**: In a separate terminal, from the `frontend` directory, run:
    ```bash
    npm run dev
    ```

### 5. Access the Application

-   **Frontend**: `http://localhost:3000`
-   **Backend API Docs**: `http://localhost:8000/docs`

## 🔧 Configuration

All backend configuration is managed in the `backend/.env` file. This is where you set your default model and provide API keys and URLs for any LLM services you want to use.

### Model Configuration

-   **`DEFAULT_MODEL`**: The model to use for chats and actions.
-   **`OLLAMA_HOST`**: URL for your local Ollama instance.
-   **`OPENAI_API_KEY` / `OPENAI_BASE_URL`**: Credentials for the official OpenAI API.
-   **`OPENAI_MODELS`**: A comma-separated list of models to make available from OpenAI (e.g., `gpt-4,gpt-3.5-turbo`).
-   See the `.env.example` file for more options, including custom OpenAI-compatible endpoints.

## 💡 Usage

1.  **Start a Chat**: Type a message and press Enter.
2.  **Add to Knowledge Base**:
    -   Attach one or more text/code files.
    -   Type `/add_knowledge` in the input field.
    -   Click "Send."
    -   A dialog will appear prompting you for a filename. You can type one yourself or click the "AI" button to have one generated for you.
    -   Confirm the filename to save the files. The assistant will provide a brief summary.
3.  **Reference Knowledge**:
    -   In a new chat, type `@` and the name of the file you just saved.
    -   Ask a question about its content (e.g., `@my_project_summary.txt what is the main goal of this project?`).
4.  **Switch Models**: Use the model selector dropdown to change the active LLM at any time.

## 🎨 Features in Detail

### Rich Markdown Support

- **Syntax Highlighting**: Code blocks with language-specific highlighting
- **Tables**: Fully formatted tables with borders and styling
- **Lists**: Ordered and unordered lists with proper indentation
- **Typography**: Professional typography with Tailwind CSS
- **Links & Images**: Clickable links and embedded images

### Real-time Streaming

- **Server-Sent Events**: Smooth streaming of LLM responses
- **Progressive Rendering**: Markdown renders progressively as content streams
- **Interrupt Support**: Stop generation mid-stream with user feedback

### Memory Systems

- **Short-term Memory**: File system integration with content reading
- **Long-term Memory**: Persistent action definitions and knowledge
- **Smart Suggestions**: Context-aware file and action suggestions

## 📚 API Documentation

### REST Endpoints

- `GET /api/health` - Health check
- `GET /api/models` - List available models with health status
- `GET /api/files?q=<query>` - Search files
- `GET /api/actions?q=<query>` - Search actions
- `POST /api/chat/stream` - Stream chat responses
- `POST /api/chat/stop` - Stop streaming

### WebSocket Endpoints

- `ws://localhost:8000/ws/suggestions` - Real-time suggestions

## 🛠️ Development

### Frontend Development

```bash
cd frontend
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run ESLint
```

### Backend Development

```bash
cd backend
source .venv/bin/activate
python -m hyperhint.main    # Start development server
pytest                      # Run tests (if available)
```

### Adding New Models

1. Update the LLM manager in `backend/hyperhint/llm/__init__.py`
2. Add model mappings and health checks
3. Update environment variables if needed

## 🚢 Deployment

### Production Build

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
pip install -e .
uvicorn hyperhint.main:app --host 0.0.0.0 --port 8000
```

### Docker Support

*Coming soon - Docker configurations for easy deployment*

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**cyborgoat** - *Initial work and development*

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework for production
- [FastAPI](https://fastapi.tiangolo.com/) - Modern, fast web framework for building APIs
- [Ollama](https://ollama.ai/) - Local LLM runtime
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [React Markdown](https://github.com/remarkjs/react-markdown) - Markdown rendering for React

## 📊 Project Status

✅ **Completed Features**:
- Multi-LLM integration (Ollama, OpenAI)
- Real-time file suggestions
- Markdown rendering with syntax highlighting
- Server-sent events streaming
- Environment-based configuration
- Model health monitoring

🚧 **Planned Features**:
- Docker deployment
- File upload support
- Advanced memory management
- Plugin system
- Mobile responsive design improvements

---

*Built with ❤️ by cyborgoat* 