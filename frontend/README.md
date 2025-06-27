# HyperHint Chat Frontend

A Next.js 15 chat application with an intelligent, action-driven interface for interacting with LLMs.

*Created by cyborgoat*

## Features

- 🤖 **LLM Chat Interface**: Clean, modern chat UI for seamless interaction with Ollama, OpenAI, and compatible endpoints, with a comprehensive model selection and configuration interface.
- 📁 **Knowledge Management Sidebar**: A dedicated left-side drawer for viewing system status and managing knowledge files.
    -   **System Status**: Real-time memory and LLM service status updates.
    -   **Knowledge Files**: Collapsible tree view with file type icons, sizes, and a file content viewer with syntax highlighting.
- 📁 **File Autocomplete & Upload**: Type `@` to reference files or use the menu to upload local text/code files.
- ⚡ **Action Autocomplete**: Type `/` to get suggestions for available actions like `/add_knowledge`.
- 🧠 **Interactive Action Prompts**: Actions like `/add_knowledge` dynamically prompt the user for required information, such as a filename.
- 💡 **AI-Powered Suggestions**: Includes an "AI" button to generate filenames based on file content.
- 🔒 **File Validation**: Enforces client-side validation for file types (text/code only) and size (5MB per file, 20MB total).
- 🎨 **Modern UI**: Built with Tailwind CSS and shadcn/ui components.
- ⌨️ **Keyboard Navigation**: Navigate suggestions with arrow keys, select with Enter.

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Autocomplete Features

- **File Suggestions**: Type `@` followed by a filename to get suggestions for files in the knowledge base.
- **Action Suggestions**: Type `/` to access actions.
  - Using `/add_knowledge` with attachments will trigger a prompt to name the knowledge file.

### Keyboard Shortcuts

- `Enter`: Send message (or select autocomplete suggestion)
- `Shift + Enter`: New line in message
- `Arrow Up/Down`: Navigate autocomplete suggestions
- `Escape`: Close autocomplete suggestions

## API Integration

The app connects to the HyperHint FastAPI backend for all its functionality:
- `GET /api/files?q=query` - Fetches file suggestions.
- `GET /api/actions?q=query` - Fetches action suggestions.
- `POST /api/generate-filename` - Gets an AI-suggested filename based on content.
- All chat and action execution is handled through the backend's SSE streaming endpoint.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Language**: TypeScript
- **State Management**: React hooks

## Project Structure

```
src/
├── app/
│   ├── api/          # API proxy routes to the backend
│   ├── globals.css   # Global styles
│   └── page.tsx      # Main page
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── EnhancedInput.tsx  # Input with autocomplete and action handling
│   └── ChatInterface.tsx      # Main chat component
└── lib/
    └── textUtils.ts  # Text processing utilities
```

## Customization

- **Add more file types**: Update the mock data in `/api/files/route.ts`