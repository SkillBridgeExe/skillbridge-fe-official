import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Bot, User, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendLearningChatMessage } from "@/services/learning-roadmap.service";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isBot = message.role === "assistant";

  const parts = message.text.split(/(```[\s\S]*?```)/g);
  const rendered = parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3, -3).replace(/^[a-z]+\n/, ""); 
      return (
        <pre key={i} className="mt-2 mb-2 bg-slate-900 text-emerald-300 rounded-lg p-3 text-xs overflow-x-auto font-mono">
          {code.trim()}
        </pre>
      );
    }
    const boldSplit = part.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {boldSplit.map((seg, j) => {
          if (seg.startsWith("**") && seg.endsWith("**")) {
            return <strong key={j}>{seg.slice(2, -2)}</strong>;
          }
          return seg.split("\n").map((line, k) => (
            <span key={k}>{k > 0 && <br />}{line}</span>
          ));
        })}
      </span>
    );
  });

  return (
    <div className={cn("flex gap-2", isBot ? "items-start" : "items-start flex-row-reverse")}>
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        isBot ? "bg-primary text-white" : "bg-slate-200 text-slate-600"
      )}>
        {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>
      <div className={cn(
        "max-w-[85%] rounded-2xl text-sm leading-relaxed px-4 py-3 shadow-sm",
        isBot
          ? "bg-white border border-slate-200 text-slate-800"
          : "bg-primary text-white"
      )}>
        {rendered}
      </div>
    </div>
  );
}

export function AIChatPanel({ onClose }: { onClose?: () => void }) {
  const { t, i18n } = useTranslation("common");
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      text: t("learning.chat.sessionGreeting"),
    },
  ]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    try {
      const reply = await sendLearningChatMessage({
        message: trimmed,
        conversationId,
        language: i18n.language.startsWith("vi") ? "vi" : "en",
      });
      setConversationId(reply.conversationId);
      setTyping(false);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", text: reply.message }]);
    } catch (error) {
      setTyping(false);
      const message = error instanceof Error ? error.message : t("learning.chat.sendError");
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", text: message }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200 w-80 lg:w-96 flex-shrink-0 animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">SkillBridge AI</p>
            <p className="text-[11px] text-slate-500">{t("learning.chat.status")}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(m => <MessageBubble key={m.id} message={m} />)}
        {typing && (
          <div className="flex gap-2 items-center">
            <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-1 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl pr-2">
          <input
            className="flex-1 text-sm bg-transparent px-4 py-3 outline-none placeholder:text-slate-400"
            placeholder={t("learning.chat.sessionPlaceholder")}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
          />
          <Button size="icon" className="rounded-lg h-8 w-8 flex-shrink-0" onClick={handleSend} disabled={!input.trim()}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
