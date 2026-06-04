import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Sparkles, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function SummarySection() {
  const { summary, summaryMode, setSummary, setSummaryMode } = useCvBuilderStore();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!summary.trim()) {
      return toast({ title: "Please tell us about yourself first", variant: "destructive" });
    }
    setIsGenerating(true);
    // MOCK: Simulate AI generation
    setTimeout(() => {
      setSummary(
        `Results-driven ${summary.includes("student") ? "student" : "professional"} with a passion for innovation. ` +
        `Eager to apply theoretical knowledge and practical experience in a dynamic work environment.`
      );
      setIsGenerating(false);
      setSummaryMode("manual");
      toast({ title: "Summary Generated" });
    }, 1500);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className={cn("flex-1", summaryMode === "manual" && "border-primary text-primary bg-primary/5")}
          onClick={() => setSummaryMode("manual")}
        >
          <Edit3 className="w-4 h-4 mr-2" /> Write Manually
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn("flex-1", summaryMode === "ai" && "border-primary text-primary bg-primary/5")}
          onClick={() => setSummaryMode("ai")}
        >
          <Sparkles className="w-4 h-4 mr-2" /> Generate with AI
        </Button>
      </div>

      <div className="space-y-2">
        <Label>{summaryMode === "ai" ? "Tell AI about yourself" : "Professional Summary"}</Label>
        <Textarea
          className="min-h-[120px] resize-none text-[13px]"
          placeholder={
            summaryMode === "ai"
              ? "Example: I am a final-year Software Engineering student interested in Business Analysis. I have experience writing user stories..."
              : "Write a brief summary of your background, skills, and career goals..."
          }
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>

      {summaryMode === "ai" && (
        <div className="flex justify-end gap-2">
          <Button onClick={handleGenerate} disabled={isGenerating} size="sm" className="bg-primary hover:bg-primary/90 text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate Summary"}
          </Button>
        </div>
      )}

      {summaryMode === "manual" && summary && (
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setSummaryMode("ai")}>
            <Sparkles className="w-3 h-3 mr-1" /> Regenerate
          </Button>
        </div>
      )}
    </div>
  );
}
