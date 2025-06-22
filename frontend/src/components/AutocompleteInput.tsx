"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AutocompleteInputProps {
  onSend: (message: string) => void;
}

interface SuggestionItem {
  id: string;
  label: string;
  description?: string;
}

// Fetch suggestions from API
const fetchSuggestions = async (
  type: "@" | "/",
  query: string
): Promise<SuggestionItem[]> => {
  try {
    const endpoint = type === "@" ? "/api/files" : "/api/actions";
    const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    return type === "@" ? data.files : data.actions;
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
};

export default function AutocompleteInput({ onSend }: AutocompleteInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerType, setTriggerType] = useState<"@" | "/" | null>(null);
  const [triggerPosition, setTriggerPosition] = useState(0);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setTriggerType(trigger);
        setTriggerPosition(triggerPos);
        setSelectedIndex(0);
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

    const beforeTrigger = input.substring(0, triggerPosition);
    const afterTrigger = input.substring(
      inputRef.current?.selectionStart || input.length
    );
    const newValue =
      beforeTrigger + triggerType + suggestion.label + " " + afterTrigger;

    setInput(newValue);
    setShowSuggestions(false);
    setTriggerType(null);

    // Focus back to input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos =
          beforeTrigger.length +
          triggerType.length +
          suggestion.label.length +
          1;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleSend = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput("");
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (use @ for files, / for actions)"
            className="w-full h-8 p-1 text-sm border border-input bg-background rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            rows={1}
          />

          {showSuggestions && suggestions.length > 0 && (
            <Card
              ref={suggestionsRef}
              className="absolute bottom-full mb-2 w-full max-h-48 overflow-y-auto z-50 shadow-lg"
            >
              <div className="p-1">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.id}
                    className={`flex flex-col px-3 py-2 cursor-pointer rounded-sm transition-colors text-xs ${
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
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <Button
          onClick={handleSend}
          disabled={!input.trim()}
          className="self-end"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
