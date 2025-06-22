# Frontend Components Documentation

## Core Components

### ChatInterface.tsx
The main chat interface component that handles:
- Message display and management
- Real-time streaming from backend
- Scroll management and auto-scrolling
- Loading states and error handling

**Key Features:**
- SSE (Server-Sent Events) integration
- Message bubbles with proper styling
- Processing dots that disappear when content arrives
- Model selection integration

### EnhancedInput.tsx
Advanced input component with:
- File upload support (drag & drop, button click)
- Autocomplete for files (@) and actions (/)
- Badge display for selected files/actions
- Send/Stop button with dynamic behavior

**Autocomplete Triggers:**
- `@` - File references
- `/` - Action commands

### ModelSelector.tsx
Dropdown component for selecting AI models:
- Claude variants (claude-4-sonnet, claude-3-haiku)
- GPT models (gpt-3.5-turbo, gpt-4, gpt-4-turbo)
- Llama models (llama3.2, llama3.1, codellama)

### UI Components (shadcn/ui)
- **Button**: Primary actions, secondary actions
- **Input**: Text input fields
- **Card**: Content containers
- **ScrollArea**: Scrollable content areas
- **Dialog**: Modal dialogs
- **DropdownMenu**: Dropdown menus
- **Badge**: Tags and labels

## Styling System

### Tailwind CSS
- Utility-first CSS framework
- Custom color scheme with stone theme
- Responsive design utilities
- Dark mode support

### Design Tokens
- **Colors**: Primary, secondary, muted, accent
- **Typography**: Font sizes, weights, line heights
- **Spacing**: Consistent padding and margins
- **Borders**: Rounded corners, border widths

## State Management

### React Hooks
- `useState`: Component state
- `useRef`: DOM references and mutable values
- `useEffect`: Side effects and lifecycle

### Message Management
```typescript
interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Date;
  attachments?: Array<{
    type: "file" | "image";
    name: string;
    url?: string;
  }>;
}
```

## Real-time Features

### Server-Sent Events (SSE)
- Streaming chat responses
- Real-time content updates
- Error handling and fallbacks
- Stream cancellation support

### WebSocket Integration
- File/action suggestions
- Real-time updates
- Connection management

## File Upload System

### Supported Types
- **Documents**: PDF, DOC, TXT, MD
- **Images**: PNG, JPG, JPEG, GIF, SVG
- **Code**: JS, TS, PY, JSON, YAML

### Upload Methods
1. Drag and drop onto input area
2. Click @ button and select files
3. Paste images from clipboard

## Responsive Design

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Layout
- Fixed header with model selector
- Scrollable message area
- Fixed input area at bottom
- Proper height constraints (100vh)

## Performance Optimizations

### Virtualization
- Efficient message rendering
- Scroll position management
- Memory usage optimization

### Debouncing
- Search input debouncing
- API call optimization
- Reduced server load 