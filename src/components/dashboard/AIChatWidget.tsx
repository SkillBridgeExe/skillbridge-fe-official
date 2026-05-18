import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Bot,
  X,
  Send,
  Sparkles,
  BookOpen,
  Video,
  Upload,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MOCK_AI_CHAT_INITIAL,
  MOCK_AI_RESPONSES,
} from "@/lib/mock-data/dashboard";
import type { AIChatMessage } from "@/lib/mock-data/dashboard";

// Keyword matching for mock AI responses
function getAIResponse(userText: string): string {
  const lower = userText.toLowerCase();
  if (lower.includes("learn") || lower.includes("study") || lower.includes("course") || lower.includes("module"))
    return MOCK_AI_RESPONSES.learn;
  if (lower.includes("cv") || lower.includes("resume") || lower.includes("match") || lower.includes("scan"))
    return MOCK_AI_RESPONSES.cv;
  if (lower.includes("interview") || lower.includes("mock") || lower.includes("practice"))
    return MOCK_AI_RESPONSES.interview;
  if (lower.includes("skill") || lower.includes("gap") || lower.includes("weak") || lower.includes("strong"))
    return MOCK_AI_RESPONSES.skill;
  if (lower.includes("help") || lower.includes("what can") || lower.includes("how"))
    return MOCK_AI_RESPONSES.help;
  return MOCK_AI_RESPONSES.default;
}

export default function AIChatWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasNotification, setHasNotification] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load initial messages when opening
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setHasNotification(false);
    if (messages.length === 0) {
      setMessages([...MOCK_AI_CHAT_INITIAL]);
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [messages.length]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Send message
  const handleSend = useCallback(() => {
    if (!input.trim()) return;

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: input.trim(),
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      const aiResponse: AIChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: getAIResponse(userMsg.text),
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (href: string) => {
    navigate(href);
    setIsOpen(false);
  };

  return (
    <>
      {/* ─── AI Chat Panel (Open State) ─── */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-white border border-slate-200 shadow-2xl transition-all duration-300",
            // Mobile: bottom popup
            "bottom-4 right-4 left-4 h-[500px] rounded-2xl",
            // Desktop: full right panel
            "xl:bottom-4 xl:right-4 xl:left-auto xl:top-24 xl:w-80 xl:h-auto xl:rounded-2xl"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-primary via-blue-500 to-cyan-400 text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm shadow-inner flex items-center justify-center relative">
                <Bot className="w-4 h-4" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-primary rounded-full" />
              </div>
              <div>
                <h3 className="text-[13px] font-bold tracking-wide">SkillBridge AI</h3>
                <p className="text-[10px] text-white/80 font-medium">Ask me anything</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.sender === "ai" ? "justify-start" : "justify-end"
                )}
              >
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.6]",
                    msg.sender === "ai"
                      ? "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"
                      : "bg-primary text-white rounded-tr-sm shadow-sm"
                  )}
                >
                  {msg.sender === "ai" && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-bold text-slate-900 tracking-wide"> SkillBridge AI</span>
                    </div>
                  )}
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Quick Actions */}
                  {msg.quickActions && msg.sender === "ai" && (
                    <div className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-slate-100">
                      {msg.quickActions.map((action) => {
                        const actionIcons: Record<string, React.ElementType> = {
                          "Continue Learning": BookOpen,
                          "Book Interview": Video,
                          "Upload CV": Upload,
                        };
                        const ActionIcon = actionIcons[action.label] || MessageCircle;

                        return (
                          <button
                            key={action.label}
                            onClick={() => handleQuickAction(action.href)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold text-left",
                              "bg-slate-50 border border-slate-100 text-slate-700 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all group"
                            )}
                          >
                            <div className="w-5 h-5 rounded bg-white border border-slate-100 shadow-sm flex items-center justify-center group-hover:border-primary/20 group-hover:bg-primary/5">
                              <ActionIcon className="w-3 h-3 group-hover:text-primary" />
                            </div>
                            {action.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary/50" />
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100 flex-shrink-0">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask SkillBridge..."
                className="w-full text-[13px] bg-slate-50 border border-slate-200 rounded-full pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-slate-400 transition-all shadow-sm"
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!input.trim()}
                className={cn(
                  "absolute right-1.5 w-8 h-8 rounded-full p-0 transition-all",
                  input.trim() ? "bg-primary text-white hover:bg-primary/90 shadow-md" : "bg-slate-200 text-slate-400"
                )}
              >
                <Send className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Floating Button (Closed State) ─── */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className={cn(
            "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full",
            "flex items-center justify-center",
            "bg-gradient-to-r from-primary to-blue-500 text-white",
            "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
            "hover:scale-105 active:scale-95 transition-all duration-200"
          )}
        >
          <Bot className="w-6 h-6" />
          {hasNotification && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">1</span>
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
        </button>
      )}
    </>
  );
}
