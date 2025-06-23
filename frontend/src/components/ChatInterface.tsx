"use client";

import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import EnhancedInput from "@/components/EnhancedInput";
import ModelSelector from "@/components/ModelSelector";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import MarkdownMessage from "@/components/MarkdownMessage";
import { processMarkdownContent, accumulateStreamingContent } from "@/lib/textUtils";

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
  const [selectedModel, setSelectedModel] = useState("llama3.2");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const currentStreamRef = useRef<{ eventSource?: EventSource; streamId?: string } | null>(null);

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

    // Generate unique stream ID
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create assistant message that will be updated with streaming content
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      content: "",
      role: "assistant",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Connect to SSE endpoint
      const response = await fetch("http://localhost:8000/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content,
          attachments: attachments || [],
          model: selectedModel,
          stream_id: streamId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body reader available");
      }

      // Store stream reference for cancellation
      currentStreamRef.current = { streamId };

      let buffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'start':
                  console.log('Stream started:', data.timestamp);
                  break;
                  
                case 'content':
                  // Turn off loading state on first content chunk
                  if (assistantContent === "") {
                    setIsLoading(false);
                  }
                  // Append content to assistant message using text utilities
                  assistantContent = accumulateStreamingContent(assistantContent, data.content);
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: assistantContent }
                        : msg
                    )
                  );
                  break;
                  
                case 'complete':
                  console.log('Stream completed:', data.timestamp);
                  setIsLoading(false);
                  currentStreamRef.current = null;
                  break;
                  
                case 'cancelled':
                  console.log('Stream cancelled:', data.message);
                  setIsLoading(false);
                  currentStreamRef.current = null;
                  // Add system message about cancellation
                  const cancelMessage: Message = {
                    id: Date.now().toString(),
                    content: data.message || "Generation stopped by user.",
                    role: "system",
                    timestamp: new Date(),
                  };
                  setMessages((prev) => [...prev, cancelMessage]);
                  break;
                  
                case 'error':
                  console.error('Stream error:', data.message);
                  setIsLoading(false);
                  currentStreamRef.current = null;
                  // Add error message
                  const errorMessage: Message = {
                    id: Date.now().toString(),
                    content: `Error: ${data.message}`,
                    role: "system",
                    timestamp: new Date(),
                  };
                  setMessages((prev) => [...prev, errorMessage]);
                  break;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('SSE connection error:', error);
      setIsLoading(false);
      currentStreamRef.current = null;
      
      // Add error message to chat
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}. Falling back to mock response.`,
        role: "system",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      // Fallback to mock response
      setTimeout(() => {
        const fallbackMessage: Message = {
          id: (Date.now() + 2).toString(),
          content: `This is a fallback mock response using ${selectedModel}. You sent: "${content}"${
            attachments ? ` with ${attachments.length} attachment(s)` : ""
          }. The backend connection failed, but this shows the UI still works.`,
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, fallbackMessage]);
      }, 1000);
    }
  };

  const handleStopGeneration = async () => {
    if (currentStreamRef.current?.streamId) {
      try {
        // Send stop request to backend
        await fetch("http://localhost:8000/api/chat/stop", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stream_id: currentStreamRef.current.streamId,
          }),
        });
      } catch (error) {
        console.error('Error stopping stream:', error);
      }
    }

    setIsLoading(false);
    currentStreamRef.current = null;
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
    <div className="flex overflow-hidden flex-col h-screen bg-background">
      {/* Header with model selector */}
      <div className="flex-shrink-0 border-b px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center mx-auto max-w-4xl">
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
      <div className="flex flex-col flex-1 min-h-0">
        {/* Messages area with proper ScrollArea */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="px-4 py-6 mx-auto max-w-4xl">
              {messages.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
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
                                  className="flex items-center px-2 py-1 space-x-2 text-xs rounded-md bg-muted"
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
                          {message.role === "assistant" && !message.content && isLoading ? (
                            // Show processing dots only for empty assistant messages during loading
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
                          ) : message.role === "assistant" ? (
                            <MarkdownMessage 
                              content={processMarkdownContent(message.content)} 
                              className="text-sm"
                            />
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {message.content}
                            </p>
                          )}
                        </div>

                        {/* Timestamp */}
                        {message.role !== "system" && (
                          <p className="px-1 text-xs text-muted-foreground">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Generating indicator */}
        {isLoading && (
          <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <div className="mx-auto max-w-4xl">
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
          <div className="p-4 mx-auto max-w-4xl">
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
