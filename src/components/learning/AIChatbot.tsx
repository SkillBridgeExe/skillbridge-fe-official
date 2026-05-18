import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

// Canned responses keyed on simple keyword matching (no API needed yet)
const CANNED: Array<{ keywords: string[]; answer: string }> = [
  {
    keywords: ["generic", "generics"],
    answer: "**Generics** in TypeScript let you write flexible, reusable code that works with multiple data types.\n\n```ts\nfunction identity<T>(arg: T): T {\n  return arg;\n}\n```\n\nWant me to explain a specific part in more detail?",
  },
  {
    keywords: ["conditional type", "conditional types"],
    answer: "**Conditional Types** follow the form `A extends B ? C : D`.\n\nExample:\n```ts\ntype IsString<T> = T extends string ? true : false;\n```\n\nThey are very useful when building advanced utility types.",
  },
  {
    keywords: ["usememo", "usecallback", "memo", "memoization"],
    answer: "- `useMemo` caches the result of a **computation**.\n- `useCallback` caches a **function reference**.\n- `React.memo` wraps a component to skip re-renders when props are unchanged.\n\nRule of thumb: only use them when profiling confirms a real performance issue.",
  },
  {
    keywords: ["zustand"],
    answer: "**Zustand** is a very lightweight state management library for React.\n\n```ts\nconst useStore = create<State>()(set => ({\n  count: 0,\n  inc: () => set(s => ({ count: s.count + 1 })),\n}));\n```\n\nIt is simpler than Redux, requires no Provider, and is a great choice for mid-sized projects.",
  },
  {
    keywords: ["react query", "tanstack query", "usequery"],
    answer: "**TanStack Query** handles **server state** for you:\n- Automatic caching and background refetching\n- Built-in loading and error states\n- Support for optimistic updates\n\nCommon combo with Zustand: Query = server state, Zustand = client/UI state.",
  },
  {
    keywords: ["vitest", "jest", "testing", "test"],
    answer: "For Vite projects, **Vitest** is usually the best choice because it shares the same tooling and config style.\n\n```ts\nimport { describe, it, expect } from 'vitest';\ndescribe('sum', () => {\n  it('adds numbers', () => expect(1 + 1).toBe(2));\n});\n```\n\nPair it with **React Testing Library** for component testing.",
  },
  {
    keywords: ["github action", "cicd", "ci/cd", "workflow"],
    answer: "A basic GitHub Actions workflow for frontend projects:\n\n```yaml\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci && npm test\n```\n\nThen add `npm run build` and deploy to Netlify/Vercel.",
  },
  {
    keywords: ["micro frontend", "micro-frontend", "mfe"],
    answer: "**Micro-frontends** split a frontend into independent applications, each owned by a team.\n\nPopular approaches:\n- **Module Federation** (Webpack 5 / Vite)\n- **Single-spa**\n- **Nx monorepo**\n\nThey are often unnecessary for small projects, but very useful at large scale.",
  },
];

function getReply(input: string): string {
  const lower = input.toLowerCase();
  for (const entry of CANNED) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.answer;
    }
  }
  return "Great question! I do not have an automated answer for that topic yet. Try checking MDN, official docs, or YouTube - that is often the fastest way to learn effectively.\n\nYou can also ask me about: generics, conditional types, useMemo, Zustand, React Query, Vitest, GitHub Actions, or micro-frontends.";
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
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      text: "Hello! I am SkillBridge's AI learning assistant.\n\nDo you have any questions about your lessons? Ask me about generics, React performance, Zustand, testing, or any topic in your roadmap.",
    },
  ]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, typing]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    // Simulate bot "thinking"
    setTimeout(() => {
      const reply = getReply(trimmed);
      setTyping(false);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", text: reply }]);
    }, 800);
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
        aria-label="Toggle AI chat"
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
            <p className="text-xs text-slate-500">Learning Assistant</p>
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
            placeholder="Ask AI about your lessons..."
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
