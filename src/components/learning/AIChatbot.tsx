import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, X, Send, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendLearningChatMessage, getLearningChatHistory } from "@/services/learning-roadmap.service";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

// Minimal markdown-like renderer (supports ** bold and ```code blocks```)
function MessageBubble({ message }: { message: ChatMessage }) {
  const isBot = message.role === "assistant";

  // Split on ```...``` blocks
  const parts = message.text.split(/(```[\s\S]*?```)/g);
  const rendered = parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3, -3).replace(/^[a-z]+\n/, ""); // strip language tag
      return (
        <pre key={i} className="mt-2 mb-2 bg-slate-900 text-emerald-300 rounded-lg p-3 text-xs overflow-x-auto font-mono">
          {code.trim()}
        </pre>
      );
    }
    // Bold **text**
    const boldSplit = part.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {boldSplit.map((seg, j) => {
          if (seg.startsWith("**") && seg.endsWith("**")) {
            return <strong key={j}>{seg.slice(2, -2)}</strong>;
          }
          // Preserve newlines
          return seg.split("\n").map((line, k) => (
            <span key={k}>{k > 0 && <br />}{line}</span>
          ));
        })}
      </span>
    );
  });

  return (
    <div className={cn("flex gap-2", isBot ? "items-start" : "items-start flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        isBot ? "bg-primary text-white" : "bg-slate-200 text-slate-600"
      )}>
        {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div className={cn(
        "max-w-[80%] rounded-2xl text-sm leading-relaxed px-4 py-3",
        isBot
          ? "bg-white border border-slate-200 text-slate-800 shadow-sm"
          : "bg-primary text-white"
      )}>
        {rendered}
      </div>
    </div>
  );
}


export function AIChatbot() {
  const { t, i18n } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      text: t("learning.chat.greeting"),
    },
  ]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversation ID and history on mount
  useEffect(() => {
    const savedId = localStorage.getItem("skillbridge_chat_conv_id_global");
    if (savedId) {
      setConversationId(savedId);
      setTyping(true);
      getLearningChatHistory(savedId)
        .then((res) => {
          if (res.history && res.history.length > 0) {
            setMessages(res.history.map((m: any) => ({
              id: m.id || Date.now().toString(),
              role: m.role,
              text: m.text || m.message || "",
            })));
          }
        })
        .catch((err) => {
          console.error("Failed to load global chat history:", err);
        })
        .finally(() => {
          setTyping(false);
        });
    }
  }, []);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, typing]);

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
      localStorage.setItem("skillbridge_chat_conv_id_global", reply.conversationId);
      setTyping(false);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", text: reply.message }]);
    } catch (error) {
      setTyping(false);
      const message = error instanceof Error ? error.message : t("learning.chat.sendError");
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", text: message }]);
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
          open ? "bg-slate-700 hover:bg-slate-800" : "bg-primary hover:bg-primary/90"
        )}
        aria-label={t("learning.chat.toggle")}
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </button>

      {/* Chat panel */}
      <div className={cn(
        "fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col transition-all duration-300 origin-bottom-right",
        open ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"
      )}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 rounded-t-2xl bg-gradient-to-r from-primary/10 to-emerald-500/10">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">SkillBridge AI</p>
            <p className="text-xs text-slate-500">{t("learning.chat.status")}</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-72">
          {messages.map(m => <MessageBubble key={m.id} message={m} />)}
          {typing && (
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-100">
          <input
            className="flex-1 text-sm rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
            placeholder={t("learning.chat.placeholder")}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
          />
          <Button size="icon" className="rounded-xl h-9 w-9 flex-shrink-0" onClick={handleSend} disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
