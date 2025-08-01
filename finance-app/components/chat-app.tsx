"use client";

import { ChatMessageArea } from "@/components/ui/chat-message-area";
import { useAuth } from "@clerk/nextjs";
import { MessageCircle, X, History } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  type: "user" | "assistant";
  timestamp: Date;
}

interface ConversationHistory {
  conversationId: string;
  lastMessage: string;
  createdAt: string;
}

const ChatApp = () => {
  const { isSignedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "Welcome to the AI Assistant! How can I help you today?",
      type: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<
    ConversationHistory[]
  >([]);
  const [showHistory, setShowHistory] = useState(false);
  const messageAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isSignedIn) {
      loadConversations();
    }
  }, [isSignedIn]);

  const loadConversations = async () => {
    try {
      const response = await fetch("/api/aichat/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversationHistory(data.data);
        console.log("Available conversations:", data.data);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const loadConversationMessages = (conversation: ConversationHistory) => {
    // Convert conversation history to message format
    const messages: Message[] = [];

    // Parse the conversation data and create messages
    // Since we only have lastMessage, we'll create a simple conversation view
    messages.push({
      id: `${conversation.conversationId}-last`,
      content: conversation.lastMessage,
      type: conversation.lastMessage.toLowerCase().includes("tell me")
        ? "user"
        : "assistant",
      timestamp: new Date(conversation.createdAt),
    });

    setMessages(messages);
    setConversationId(conversation.conversationId);
    setShowHistory(false);
  };

  const startNewConversation = () => {
    setMessages([
      {
        id: "welcome",
        content: "Welcome to the AI Assistant! How can I help you today?",
        type: "assistant",
        timestamp: new Date(),
      },
    ]);
    setConversationId(null);
    setShowHistory(false);
  };

  const getPerplexityResponse = async (
    userMessage: string
  ): Promise<string> => {
    try {
      const response = await fetch("/api/aichat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get response");
      }

      const data = await response.json();

      // Update conversationId if it's a new conversation
      if (!conversationId && data.data.conversationId) {
        setConversationId(data.data.conversationId);
      }

      return data.data.response;
    } catch (error) {
      console.error("Error getting Perplexity response:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading) return;

    if (!isSignedIn) {
      toast.error("Please sign in to use the chat");
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue,
      type: "user",
      timestamp: new Date(),
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      // Get AI response from Perplexity
      const aiResponseContent = await getPerplexityResponse(currentInput);

      const aiMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: aiResponseContent,
        type: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Reload conversations to update history
      loadConversations();
    } catch (error) {
      console.error("Error in chat:", error);
      toast.error("Failed to get AI response. Please try again.");

      // Add error message to chat
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Sorry, I encountered an error. Please try again.",
        type: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl ${
          isOpen ? "scale-0" : "scale-100"
        }`}
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat Popup Window */}
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
          isOpen
            ? "visible scale-100 opacity-100"
            : "invisible scale-95 opacity-0"
        }`}
      >
        <div className="flex h-[600px] w-[380px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
            <div>
              <h3 className="text-lg font-semibold">AI Assistant</h3>
              <p className="text-xs opacity-90">Powered by Perplexity AI</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="rounded-lg p-1 transition-colors hover:bg-white/20"
                title="View conversation history"
              >
                <History size={20} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 transition-colors hover:bg-white/20"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Chat Messages or History */}
          {showHistory ? (
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">
                  Conversation History
                </h4>
                <button
                  onClick={startNewConversation}
                  className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                >
                  New Chat
                </button>
              </div>
              <div className="space-y-2">
                {conversationHistory.length === 0 ? (
                  <p className="text-center text-sm text-gray-500">
                    No previous conversations
                  </p>
                ) : (
                  conversationHistory.map((conv) => (
                    <button
                      key={conv.conversationId}
                      onClick={() => loadConversationMessages(conv)}
                      className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50"
                    >
                      <p className="line-clamp-2 text-sm text-gray-700">
                        {conv.lastMessage}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(conv.createdAt).toLocaleString()}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <ChatMessageArea className="flex-1 overflow-y-auto bg-gray-50 p-4">
              <div ref={messageAreaRef} className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.type === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div className="flex max-w-[80%] items-start gap-2">
                      {message.type === "assistant" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
                          <div className="h-4 w-4 rounded-full bg-white" />
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          message.type === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-800 shadow-sm"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
                        <div className="h-4 w-4 rounded-full bg-white" />
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <div className="flex space-x-1">
                          <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                          <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                          <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ChatMessageArea>
          )}

          {/* Footer with branding */}
          <div className="border-t bg-gray-50 px-4 py-2">
            <p className="text-center text-xs text-gray-500">
              <Link
                href="https://www.linkedin.com/in/ishitva-shukla-25b864218/"
                target="_blank"
              >
                This is built by me @ishitvashukla
              </Link>
            </p>
          </div>

          {/* Chat Input */}
          <div className="border-t bg-white p-3">
            {!isSignedIn ? (
              <div className="text-center text-sm text-gray-500">
                Please sign in to chat
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Chat with AI..."
                  disabled={isLoading || showHistory}
                  className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 pr-12 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white disabled:opacity-50"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || isLoading || showHistory}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400 transition-colors hover:text-blue-600 disabled:opacity-50"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export { ChatApp };
