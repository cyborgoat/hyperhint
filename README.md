# HyperHint 🚀

> An intelligent AI-powered chat interface with real-time file suggestions and markdown rendering

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.13-blue)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Latest-3178C6)](https://www.typescriptlang.org/)

## 🌟 Overview

HyperHint is a modern, full-stack AI chat application that combines the power of Large Language Models with intelligent file system integration. Built with Next.js 15 and FastAPI, it provides a seamless chat experience with real-time file suggestions, markdown rendering, and multi-model LLM support.

### ✨ Key Features

- 🤖 **Multi-LLM Support**: Ollama, OpenAI, and OpenAI-compatible endpoints
- 📁 **Smart File Integration**: Real-time file suggestions with `@` trigger
- ⚡ **Action System**: Quick actions with `/` trigger
- 🎨 **Rich Markdown Rendering**: Full markdown support with syntax highlighting
- 🔄 **Real-time Streaming**: Server-Sent Events for smooth chat experience
- 🎯 **Intelligent Memory**: Short-term (files) and long-term (actions) memory systems
- 🌙 **Modern UI**: Beautiful interface with Tailwind CSS and shadcn/ui
- 🔌 **Environment-based Config**: Easy deployment with environment variables

## 🏗️ Architecture

```
hyperhint/
├── frontend/                 # Next.js 15 + TypeScript
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   └── lib/             # Utilities and helpers
│   ├── tailwind.config.js   # Tailwind CSS configuration
│   └── package.json         # Frontend dependencies
├── backend/                 # FastAPI + Python
│   ├── hyperhint/
│   │   ├── llm/            # LLM integrations (Ollama, OpenAI)
│   │   ├── memory/         # Memory management systems
│   │   └── server/         # API routes and SSE handlers
│   ├── data/memory/        # File system memory storage
│   ├── pyproject.toml      # Python dependencies
│   └── .env               # Environment configuration
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.13+
- **uv** package manager (recommended)
- **Ollama** (optional, for local LLM)

### 1. Clone the Repository

```bash
git clone https://github.com/cyborgoat/hyperhint.git
cd hyperhint
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment with Python 3.13
uv venv --python 3.13
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
uv pip install -e .

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Start Backend Server

```bash
cd ../backend
source .venv/bin/activate
python -m hyperhint.main
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Default LLM Model
DEFAULT_MODEL=llama3.2

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434

# OpenAI Configuration (optional)
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1

# Custom OpenAI-compatible endpoint (optional)
CUSTOM_OPENAI_API_KEY=your-custom-api-key
CUSTOM_OPENAI_BASE_URL=https://your-custom-endpoint.com/v1
```

### Supported Models

- **Ollama**: llama3.2, gemma3, deepseek-r1, qwen3, etc.
- **OpenAI**: gpt-4, gpt-4-turbo, gpt-3.5-turbo
- **Claude**: claude-3-sonnet, claude-3-haiku (via OpenAI-compatible endpoints)

## 💡 Usage

### Chat Interface

1. **Basic Chat**: Type your message and press Enter
2. **File References**: Use `@` to reference files from your project
3. **Quick Actions**: Use `/` to access predefined actions
4. **Model Selection**: Click the model selector to switch between available models

### File Integration

- **Auto-detection**: Files are automatically scanned from `data/memory/short_term/`
- **Content Reading**: Referenced files are read and included in the chat context
- **Real-time Updates**: File suggestions update as you type

### Action System

Available actions:
- `/chat` - General conversation
- `/analyze` - Analyze file content or code
- `/format` - Format code or text
- `/add_knowledge` - Add content to knowledge base

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