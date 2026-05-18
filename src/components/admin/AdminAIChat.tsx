import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Send, Sparkles, Upload } from "lucide-react";

type ChatMessage = {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
};

function nowTs() {
  return "Just now";
}

export default function AdminAIChat() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "ai-welcome",
      sender: "ai",
      text: "Hi! I’m your Admin Decision Assistant. Ask me about user drop-off, revenue trends, churn risk, or mentor performance (mock).",
      timestamp: nowTs(),
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const aiResponse = useMemo(() => {
    return (text: string) => {
      const t = text.toLowerCase();
      if (t.includes("drop") || t.includes("funnel") || t.includes("roadmap")) {
        return "Drop detected: ~40% giảm ở bước Roadmap Step 2. Gợi ý: tối ưu onboarding và thêm content “practical exercises” để giảm rời bỏ.";
      }
      if (t.includes("revenue") || t.includes("mrr") || t.includes("mr.") || t.includes("growth")) {
        return "Revenue trend looks volatile: MRR giảm do mix subscription giảm ở phân khúc mới. Gợi ý: chạy A/B test pricing và tăng offer bundle cho users mới.";
      }
      if (t.includes("mentor") || t.includes("top mentor")) {
        return "Mentor performance insight: Mentor A is seeing strong growth (rating +0.2, conversion +12%). Suggestion: prioritize scheduling for Mentor A this week.";
      }
      if (t.includes("churn") || t.includes("risk")) {
        return "Churn risk is elevated for premium users inactive >14 days. Suggestion: 5-day re-engagement sequence + incentive for the full course.";
      }
      return "I can help: (1) analyze funnel drops, (2) explain revenue changes, (3) suggest actions for mentors. Where would you like to start?";
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: "Just now",
    };
    setMessages((m) => [...m, userMsg]);
    setPrompt("");

    setIsThinking(true);
    await new Promise((r) => setTimeout(r, 650));

    const aiMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      sender: "ai",
      text: aiResponse(trimmed),
      timestamp: nowTs(),
    };
    setMessages((m) => [...m, aiMsg]);
    setIsThinking(false);
  };

  const quickAction = (label: string) => {
    if (label === "Upload CSV mock") {
      toast({ title: "✅ Upload CSV (mock)", description: "Đã mô phỏng upload dữ liệu để compare." });
      setPrompt("Upload CSV mock để so sánh data");
      return;
    }
    if (label === "Top mentor") {
      setPrompt("Top mentor theo tuần này");
      return;
    }
    if (label === "User yếu kỹ năng") {
      setPrompt("Người dùng yếu kỹ năng nào cần ưu tiên?");
      return;
    }
    setPrompt(label);
  };

  return (
    <Card className="rounded-2xl border-slate-200/70 dark:border-slate-700/70 shadow-sm p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <div className="text-sm font-black text-slate-900 dark:text-slate-100">AI Assistant</div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl px-3"
          onClick={() => {
            setMessages((m) => [
              m[0],
              {
                id: `ai-h-${Date.now()}`,
                sender: "ai",
                text: "Reset chat (mock). Bạn muốn phân tích drop, revenue hay mentor?",
                timestamp: nowTs(),
              },
            ]);
            toast({ title: "✅ Chat đã được reset", description: "Bắt đầu lại với mô phỏng." });
          }}
        >
          Reset
        </Button>
      </div>

      <div className="mt-3 h-[360px] overflow-auto pr-1 scrollbar-none">
        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex",
                m.sender === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm border",
                  m.sender === "user"
                    ? "bg-primary/10 border-primary/20 text-slate-900 dark:text-slate-100"
                    : "bg-white dark:bg-slate-800 border-slate-200/70 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                )}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
              </div>
            </div>
          ))}
          {isThinking ? (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 border-slate-200/70 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                Thinking<span className="inline-block w-1.5">&nbsp;</span>…
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="mt-3">
        <div className="flex flex-wrap gap-2 mb-3">
          {["Drop in funnel", "Revenue (MRR)", "Top mentor", "User yếu kỹ năng", "Upload CSV mock"].map((label) => (
            <Button
              key={label}
              type="button"
              variant="outline"
              className="rounded-full px-3 text-xs"
              onClick={() => quickAction(label)}
            >
              {label === "Upload CSV mock" ? <Upload className="w-3.5 h-3.5 mr-2" /> : <Sparkles className="w-3.5 h-3.5 mr-2" />}
              {label}
            </Button>
          ))}
        </div>

        <div className="flex gap-3 items-end">
          <Textarea
            value={prompt}
            placeholder="Ví dụ: Drop 40% ở roadmap step 2 vì sao?"
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[90px]"
          />
          <Button
            type="button"
            className="rounded-2xl px-5 bg-primary hover:bg-primary/90 text-white shadow-glow"
            disabled={isThinking}
            onClick={() => send(prompt)}
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
}

