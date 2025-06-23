'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { X, Paperclip, AtSign, Send, Square, Sparkles, Loader2 } from 'lucide-react'

interface EnhancedInputProps {
  onSend: (
    message: string, 
    attachments?: Array<{type: 'file' | 'image', name: string, url?: string}>, 
    selectedAction?: string,
    options?: { knowledgeFilename?: string }
  ) => void
  isLoading?: boolean
  isActionActive?: boolean
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

export default function EnhancedInput({ onSend, isLoading = false, isActionActive = false, onStop }: EnhancedInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerType, setTriggerType] = useState<"@" | "/" | null>(null);
  const [triggerPosition, setTriggerPosition] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<SuggestionItem[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [isFilenameModalOpen, setIsFilenameModalOpen] = useState(false);
  const [knowledgeFilename, setKnowledgeFilename] = useState('');
  const [isGeneratingFilename, setIsGeneratingFilename] = useState(false);

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
    if (!files) return;

    // Define allowed file types for text/code files
    const allowedExtensions = [
      '.txt', '.md', '.py', '.js', '.ts', '.tsx', '.jsx', 
      '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg',
      '.sql', '.sh', '.bat', '.ps1', '.php', '.rb', '.go', 
      '.rs', '.c', '.cpp', '.h', '.hpp', '.java', '.kt',
      '.swift', '.dart', '.lua', '.pl', '.r', '.m', '.scss',
      '.css', '.html', '.htm', '.vue', '.svelte', '.astro',
      '.log', '.csv', '.tsv', '.gitignore', '.env', '.dockerfile',
      '.makefile', '.cmake', '.gradle', '.properties'
    ];

    const maxFileSize = 5 * 1024 * 1024; // 5MB per file
    const maxTotalSize = 20 * 1024 * 1024; // 20MB total
    
    let totalSize = 0;
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Calculate current total size from existing attachments
    attachments.forEach(att => {
      if (att.url) {
        // For uploaded files, we need to estimate size (we'll verify later)
        totalSize += 1024; // Rough estimate, will be calculated properly below
      }
    });

    // Validate each file
    Array.from(files).forEach(file => {
      // Check file extension
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        errors.push(`"${file.name}": File type ${fileExtension} not allowed. Only text and code files are supported.`);
        return;
      }

      // Check individual file size
      if (file.size > maxFileSize) {
        errors.push(`"${file.name}": File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds 5MB limit.`);
        return;
      }

      // Check total size
      if (totalSize + file.size > maxTotalSize) {
        errors.push(`"${file.name}": Adding this file would exceed 20MB total size limit.`);
        return;
      }

      validFiles.push(file);
      totalSize += file.size;
    });

    // Show errors if any
    if (errors.length > 0) {
      alert(`File upload errors:\n\n${errors.join('\n\n')}`);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Process valid files
    validFiles.forEach(file => {
      const attachment: AttachmentItem = {
        type: 'file', // All are files for add_knowledge
        name: file.name,
        url: URL.createObjectURL(file)
      };
      setAttachments(prev => [...prev, attachment]);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Show success message for valid uploads
    if (validFiles.length > 0) {
      const totalSizeMB = (totalSize / 1024 / 1024).toFixed(1);
      console.log(`✅ ${validFiles.length} file(s) uploaded successfully. Total size: ${totalSizeMB}MB`);
    }
  };

  const handleSend = () => {
    if (isLoading && onStop) {
      onStop();
      return;
    }
    
    const isKnowledgeAction = selectedAction === 'add_knowledge';
    const hasAttachments = selectedFiles.length > 0 || attachments.length > 0;

    if (isKnowledgeAction && hasAttachments) {
      setIsFilenameModalOpen(true);
      return;
    }

    if (input.trim() || hasAttachments || isActionActive) {
      const allAttachments = [
        ...selectedFiles.map(f => ({ type: 'file' as const, name: f.label })),
        ...attachments
      ];
      
      onSend(input.trim(), allAttachments.length > 0 ? allAttachments : undefined, selectedAction || undefined);
      setInput("");
      setSelectedFiles([]);
      setAttachments([]);
      setSelectedAction(null);
      setShowSuggestions(false);
      
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

  const handleConfirmFilename = () => {
    let finalFilename = knowledgeFilename.trim();
    if (!finalFilename) {
      alert('Please provide a filename.');
      return;
    }

    if (!/\.[^/.]+$/.test(finalFilename)) {
      finalFilename += '.txt';
    }

    const allAttachments = [
      ...selectedFiles.map(f => ({ type: 'file' as const, name: f.label })),
      ...attachments
    ];

    onSend(input.trim(), allAttachments, selectedAction || undefined, { knowledgeFilename: finalFilename });

    // Reset all state
    setIsFilenameModalOpen(false);
    setKnowledgeFilename('');
    setInput("");
    setSelectedFiles([]);
    setAttachments([]);
    setSelectedAction(null);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleGenerateFilename = async () => {
    if (attachments.length === 0) return;
    setIsGeneratingFilename(true);

    try {
      const previews = await Promise.all(
        attachments.slice(0, 5).map(async (att) => { // Use first 5 files for preview
          if (att.url) {
            const response = await fetch(att.url);
            const text = await response.text();
            return `File: ${att.name}\n${text.substring(0, 300)}...`;
          }
          return `File: ${att.name}`;
        })
      );

      const response = await fetch('/api/generate-filename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previews: previews.join('\n\n') }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate filename from backend.');
      }

      const data = await response.json();
      if (data.filename) {
        setKnowledgeFilename(data.filename);
      }
    } catch (error) {
      console.error("Failed to generate filename:", error);
      alert("Could not generate a filename. Please enter one manually.");
    } finally {
      setIsGeneratingFilename(false);
    }
  };

  const hasContent = input.trim() || selectedFiles.length > 0 || attachments.length > 0;

  return (
    <div className="space-y-3">
      {/* Selected files display */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFiles.map((file) => (
            <Badge key={file.id} variant="secondary" className="flex items-center gap-1.5 text-xs">
              <AtSign className="w-3 h-3" />
              {file.label}
              <button
                onClick={() => removeSelectedFile(file.id)}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Attachments display */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <Badge key={index} variant="outline" className="flex items-center gap-1.5 text-xs">
                <Paperclip className="w-3 h-3" />
                {attachment.name}
                <button
                  onClick={() => removeAttachment(index)}
                  className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          {attachments.length > 0 && (
            <div className="text-xs text-muted-foreground">
              📁 {attachments.length} file{attachments.length > 1 ? 's' : ''} ready for knowledge analysis (text/code files only, max 5MB each, 20MB total)
            </div>
          )}
        </div>
      )}

      {/* Selected action display */}
      {selectedAction && (
        <div className="flex gap-2 items-center">
          <Badge variant="default" className="flex items-center gap-1.5 text-xs">
            /{selectedAction}
            <button
              onClick={() => setSelectedAction(null)}
              className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* Input area */}
      <div className="relative">
        <div className="flex gap-3 items-start">
          {/* @ Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-11 w-11 p-0 shrink-0 mt-0.5">
                <AtSign className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuItem onClick={openAtMenu}>
                <AtSign className="mr-2 w-4 h-4" />
                Reference Files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="mr-2 w-4 h-4" />
                Upload Text/Code Files
                <span className="ml-auto text-xs text-muted-foreground">5MB max</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Input field container */}
          <div className="relative flex-1">
            <div className="flex relative items-start rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent">
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
                className="absolute top-2 right-2 p-0 w-8 h-8 shrink-0"
                variant={isLoading ? "secondary" : "default"}
              >
                {isLoading ? (
                  <Square className="w-3 h-3" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <Card 
                ref={suggestionsRef}
                className="overflow-y-auto absolute bottom-full z-50 mb-2 w-full max-h-48 border shadow-lg"
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
          accept=".txt,.md,.py,.js,.ts,.tsx,.jsx,.json,.xml,.yaml,.yml,.toml,.ini,.cfg,.sql,.sh,.bat,.ps1,.php,.rb,.go,.rs,.c,.cpp,.h,.hpp,.java,.kt,.swift,.dart,.lua,.pl,.r,.m,.scss,.css,.html,.htm,.vue,.svelte,.astro,.log,.csv,.tsv,.gitignore,.env"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      <Dialog open={isFilenameModalOpen} onOpenChange={setIsFilenameModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name Your Knowledge File</DialogTitle>
            <DialogDescription>
              Provide a filename for the new knowledge entry. An extension is optional and defaults to .txt.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center py-2 space-x-2">
            <Input
              value={knowledgeFilename}
              onChange={(e) => setKnowledgeFilename(e.target.value)}
              placeholder="e.g., project_requirements or smart_contract.sol"
            />
            <Button onClick={handleGenerateFilename} disabled={isGeneratingFilename} size="sm">
              {isGeneratingFilename ? (
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 w-4 h-4" />
              )}
              AI
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFilenameModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmFilename}>Confirm & Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 