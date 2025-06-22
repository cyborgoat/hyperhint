"use client";

import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import EnhancedInput from "@/components/EnhancedInput";
import ModelSelector from "@/components/ModelSelector";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";

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

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("claude-4-sonnet");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const currentRequestRef = useRef<NodeJS.Timeout | null>(null);

  const handleSendMessage = async (
    content: string,
    attachments?: Array<{ type: "file" | "image"; name: string; url?: string }>
  ) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: "user",
      timestamp: new Date(),
      attachments,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate API call to LLM
    currentRequestRef.current = setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `This is a mock response using ${selectedModel}. You sent: "${content}"${
          attachments ? ` with ${attachments.length} attachment(s)` : ""
        }. In a real implementation, this would be connected to your Ollama or OpenAI compatible endpoint.`,
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
      currentRequestRef.current = null;
    }, 2000);
  };

  const handleStopGeneration = () => {
    if (currentRequestRef.current) {
      clearTimeout(currentRequestRef.current);
      currentRequestRef.current = null;
    }

    setIsLoading(false);

    // Add system message indicating the conversation was stopped
    const stopMessage: Message = {
      id: Date.now().toString(),
      content: "Generation stopped by user.",
      role: "system",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, stopMessage]);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header with model selector */}
      <div className="flex-shrink-0 border-b px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold">HyperHint</h1>
            <Separator orientation="vertical" className="h-5" />
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          </div>
        </div>
      </div>

      {/* Main content area - this will take remaining height */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Messages area with proper ScrollArea */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="max-w-4xl mx-auto px-4 py-6">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <div className="space-y-3">
                    <p className="text-xl font-medium">
                      How can I help you today?
                    </p>
                    <p className="text-sm">
                      Use{" "}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                        @
                      </code>{" "}
                      to reference files or{" "}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                        /
                      </code>{" "}
                      for actions
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : message.role === "system"
                          ? "justify-center"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] space-y-2 ${
                          message.role === "user"
                            ? "text-right"
                            : message.role === "system"
                            ? "text-center"
                            : "text-left"
                        }`}
                      >
                        {/* Attachments */}
                        {message.attachments &&
                          message.attachments.length > 0 && (
                            <div
                              className={`flex flex-wrap gap-2 mb-2 ${
                                message.role === "user"
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >
                              {message.attachments.map((attachment, index) => (
                                <div
                                  key={index}
                                  className="flex items-center space-x-2 bg-muted px-2 py-1 rounded-md text-xs"
                                >
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  <span>{attachment.name}</span>
                                </div>
                              ))}
                            </div>
                          )}

                        {/* Message content */}
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : message.role === "system"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200 text-xs"
                              : "bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                          </p>
                        </div>

                        {/* Timestamp */}
                        {message.role !== "system" && (
                          <p className="text-xs text-muted-foreground px-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl px-4 py-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-current rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-current rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Generating indicator */}
        {isLoading && (
          <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <div className="max-w-4xl mx-auto">
              <TextShimmer
                duration={1.2}
                className="pl-6 text-sm [--base-color:theme(colors.muted.foreground)] [--base-gradient-color:theme(colors.foreground)]"
              >
                Generating response...
              </TextShimmer>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-4xl mx-auto p-4">
            <EnhancedInput
              onSend={handleSendMessage}
              isLoading={isLoading}
              onStop={handleStopGeneration}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
