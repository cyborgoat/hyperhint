# HyperHint Chat Frontend

A Next.js 15 chat application with intelligent autocomplete functionality for files and actions.

## Features

- 🤖 **LLM Chat Interface**: Clean, modern chat UI ready for integration with Ollama or OpenAI compatible endpoints
- 📁 **File Autocomplete**: Type `@` to get suggestions for files in your project
- ⚡ **Action Autocomplete**: Type `/` to get suggestions for available actions (chat, generate-workflow, execute-workflow)
- 🎨 **Modern UI**: Built with Tailwind CSS and shadcn/ui components
- ⌨️ **Keyboard Navigation**: Navigate suggestions with arrow keys, select with Enter

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

- **File Suggestions**: Type `@` followed by a filename to get suggestions
  - Example: `@README` will show README.md and other matching files
  - Files are fetched from the `/api/files` endpoint

- **Action Suggestions**: Type `/` followed by an action to get suggestions
  - Available actions: `chat`, `generate-workflow`, `execute-workflow`
  - Actions are fetched from the `/api/actions` endpoint

### Keyboard Shortcuts

- `Enter`: Send message (or select autocomplete suggestion)
- `Shift + Enter`: New line in message
- `Arrow Up/Down`: Navigate autocomplete suggestions
- `Escape`: Close autocomplete suggestions

## API Integration

The app is designed to work with a FastAPI backend. Currently, it uses mock API routes:

- `GET /api/files?q=query` - Returns file suggestions
- `GET /api/actions?q=query` - Returns action suggestions

To integrate with your FastAPI server, update the `fetchSuggestions` function in `src/components/AutocompleteInput.tsx` to point to your backend endpoints.

## LLM Integration

The chat interface is ready for LLM integration. Update the `handleSendMessage` function in `src/components/ChatInterface.tsx` to connect to your Ollama or OpenAI compatible endpoint.

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
│   ├── api/          # API routes (mock endpoints)
│   ├── globals.css   # Global styles
│   └── page.tsx      # Main page
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── AutocompleteInput.tsx  # Input with autocomplete
│   └── ChatInterface.tsx      # Main chat component
└── lib/
    └── utils.ts      # Utility functions
```

## Customization

- **Add more file types**: Update the mock data in `/api/files/route.ts`
- **Add more actions**: Update the mock data in `/api/actions/route.ts`
- **Customize styling**: Modify Tailwind classes or update `globals.css`
- **Add new features**: Extend the components in the `src/components/` directory
