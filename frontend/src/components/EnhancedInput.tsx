'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { X, Paperclip, Image, AtSign, Send, Square } from 'lucide-react'

interface EnhancedInputProps {
  onSend: (message: string, attachments?: Array<{type: 'file' | 'image', name: string, url?: string}>) => void
  isLoading?: boolean
  onStop?: () => void
}

interface SuggestionItem {
  id: string
  label: string
  description?: string
}

interface AttachmentItem {
  type: 'file' | 'image'
  name: string
  url?: string
}

// Fetch suggestions from API
const fetchSuggestions = async (
  type: "@" | "/",
  query: string
): Promise<SuggestionItem[]> => {
  try {
    const endpoint = type === "@" ? "/api/files" : "/api/actions";
    const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // The backend returns the array directly, not wrapped in an object
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
};

export default function EnhancedInput({ onSend, isLoading = false, onStop }: EnhancedInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerType, setTriggerType] = useState<"@" | "/" | null>(null);
  const [triggerPosition, setTriggerPosition] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<SuggestionItem[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;

    setInput(value);

    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }

    // Check for trigger characters
    const beforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf("@");
    const lastSlashIndex = beforeCursor.lastIndexOf("/");

    let trigger: "@" | "/" | null = null;
    let triggerPos = -1;

    if (lastAtIndex > lastSlashIndex && lastAtIndex !== -1) {
      const afterAt = beforeCursor.substring(lastAtIndex + 1);
      if (!afterAt.includes(" ")) {
        trigger = "@";
        triggerPos = lastAtIndex;
      }
    } else if (lastSlashIndex > lastAtIndex && lastSlashIndex !== -1) {
      const afterSlash = beforeCursor.substring(lastSlashIndex + 1);
      if (!afterSlash.includes(" ")) {
        trigger = "/";
        triggerPos = lastSlashIndex;
      }
    }

    if (trigger) {
      const query = beforeCursor.substring(triggerPos + 1).toLowerCase();

      // Fetch suggestions from API
      fetchSuggestions(trigger, query).then((filtered) => {
        setSuggestions(filtered || []);
        setShowSuggestions((filtered || []).length > 0);
        setTriggerType(trigger);
        setTriggerPosition(triggerPos);
        setSelectedIndex(0);
      }).catch((error) => {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      });
    } else {
      setShowSuggestions(false);
      setTriggerType(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % suggestions.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(
            (prev) => (prev - 1 + suggestions.length) % suggestions.length
          );
          break;
        case "Enter":
          if (!e.shiftKey) {
            e.preventDefault();
            selectSuggestion(suggestions[selectedIndex]);
            return;
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          break;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectSuggestion = (suggestion: SuggestionItem) => {
    if (!triggerType) return;

    if (triggerType === "@") {
      // Add to selected files
      if (!selectedFiles.find(f => f.id === suggestion.id)) {
        setSelectedFiles(prev => [...prev, suggestion]);
      }
    } else if (triggerType === "/") {
      // Set selected action
      setSelectedAction(suggestion.label);
    }

    // Remove the trigger and query from input
    const beforeTrigger = input.substring(0, triggerPosition);
    const afterTrigger = input.substring(inputRef.current?.selectionStart || input.length);
    const newValue = beforeTrigger + afterTrigger;

    setInput(newValue);
    setShowSuggestions(false);
    setTriggerType(null);
    
    // Focus back to input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = beforeTrigger.length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        // Reset height
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
      }
    }, 0);
  };

  const removeSelectedFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const attachment: AttachmentItem = {
          type: file.type.startsWith('image/') ? 'image' : 'file',
          name: file.name,
          url: URL.createObjectURL(file)
        };
        setAttachments(prev => [...prev, attachment]);
      });
    }
  };

  const handleSend = () => {
    if (isLoading && onStop) {
      onStop();
      return;
    }

    if (input.trim() || selectedFiles.length > 0 || attachments.length > 0) {
      const allAttachments = [
        ...selectedFiles.map(f => ({ type: 'file' as const, name: f.label })),
        ...attachments
      ];
      
      onSend(input.trim(), allAttachments.length > 0 ? allAttachments : undefined);
      setInput("");
      setSelectedFiles([]);
      setAttachments([]);
      setSelectedAction(null);
      setShowSuggestions(false);
      
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  const openAtMenu = () => {
    fetchSuggestions("@", "").then((files) => {
      setSuggestions(files || []);
      setShowSuggestions((files || []).length > 0);
      setTriggerType("@");
      setSelectedIndex(0);
    }).catch((error) => {
      console.error("Error fetching file suggestions:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    });
  };

  const hasContent = input.trim() || selectedFiles.length > 0 || attachments.length > 0;

  return (
    <div className="space-y-3">
      {/* Selected files display */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFiles.map((file) => (
            <Badge key={file.id} variant="secondary" className="flex items-center gap-1.5 text-xs">
              <AtSign className="h-3 w-3" />
              {file.label}
              <button
                onClick={() => removeSelectedFile(file.id)}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Attachments display */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <Badge key={index} variant="outline" className="flex items-center gap-1.5 text-xs">
              {attachment.type === 'image' ? (
                <Image className="h-3 w-3" />
              ) : (
                <Paperclip className="h-3 w-3" />
              )}
              {attachment.name}
              <button
                onClick={() => removeAttachment(index)}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Selected action display */}
      {selectedAction && (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="flex items-center gap-1.5 text-xs">
            /{selectedAction}
            <button
              onClick={() => setSelectedAction(null)}
              className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* Input area */}
      <div className="relative">
        <div className="flex items-start gap-3">
          {/* @ Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-11 w-11 p-0 shrink-0 mt-0.5">
                <AtSign className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem onClick={openAtMenu}>
                <AtSign className="h-4 w-4 mr-2" />
                Reference Files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4 mr-2" />
                Upload Files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Image className="h-4 w-4 mr-2" />
                Upload Images
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Input field container */}
          <div className="flex-1 relative">
            <div className="relative flex items-start border border-input rounded-xl bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (use @ for files, / for actions)"
                className="flex-1 min-h-[44px] max-h-[200px] p-3 pr-12 bg-transparent border-0 resize-none focus:outline-none placeholder:text-muted-foreground text-sm"
                rows={1}
                disabled={isLoading}
              />
              
              {/* Send/Stop button */}
              <Button
                onClick={handleSend}
                disabled={!hasContent && !isLoading}
                size="sm"
                className="absolute right-2 top-2 h-8 w-8 p-0 shrink-0"
                variant={isLoading ? "secondary" : "default"}
              >
                {isLoading ? (
                  <Square className="h-3 w-3" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <Card 
                ref={suggestionsRef}
                className="absolute bottom-full mb-2 w-full max-h-48 overflow-y-auto z-50 shadow-lg border"
              >
                <div className="p-1">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.id}
                      className={`flex flex-col px-3 py-2 cursor-pointer rounded-sm transition-colors text-sm ${
                        index === selectedIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => selectSuggestion(suggestion)}
                    >
                      <div className="font-medium">
                        {triggerType}
                        {suggestion.label}
                      </div>
                      {suggestion.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {suggestion.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.md"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
} 