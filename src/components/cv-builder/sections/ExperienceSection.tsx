import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Plus, Trash2, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function ExperienceSection() {
  const { experience, addExperience, updateExperience, removeExperience } = useCvBuilderStore();
  const { toast } = useToast();
  const [improvingId, setImprovingId] = useState<string | null>(null);

  const handleImproveWithAI = (id: string, text: string) => {
    if (!text.trim()) {
      return toast({ title: "Please write some description first", variant: "destructive" });
    }
    setImprovingId(id);
    // MOCK: Simulate AI rewrite
    setTimeout(() => {
      const improved = `- Developed comprehensive event proposals, timelines, and execution plans for corporate events.\n- Coordinated effectively with clients, vendors, and internal teams to ensure smooth delivery.\n- Supported onsite operations and post-event reporting.`;
      updateExperience(id, "aiRewrite", improved);
      setImprovingId(null);
      toast({ title: "Improved with AI!" });
    }, 1500);
  };

  return (
    <div className="space-y-6 p-4">
      {experience.map((exp, index) => (
        <div key={exp.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 relative group">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm text-slate-700">Experience #{index + 1}</h4>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeExperience(exp.id)} disabled={experience.length === 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Company / Organization *</Label>
              <Input value={exp.company} onChange={(e) => updateExperience(exp.id, "company", e.target.value)} placeholder="e.g. SkillBridge Inc." />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Position *</Label>
              <Input value={exp.position} onChange={(e) => updateExperience(exp.id, "position", e.target.value)} placeholder="e.g. Frontend Developer" />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Start Date</Label>
              <Input value={exp.startDate} onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)} placeholder="e.g. Jan 2023" />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>End Date (or Present)</Label>
              <Input value={exp.endDate} onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)} placeholder="e.g. Present" />
            </div>

            <div className="space-y-2 col-span-2 pt-2">
              <div className="flex items-center justify-between">
                <Label>Description / Responsibilities</Label>
                <Button 
                  variant="outline" size="sm" 
                  className="h-7 text-xs border-primary text-primary hover:bg-primary/5"
                  onClick={() => handleImproveWithAI(exp.id, exp.description)}
                  disabled={improvingId === exp.id}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {improvingId === exp.id ? "Improving..." : "Improve with AI"}
                </Button>
              </div>
              
              {!exp.aiRewrite ? (
                <Textarea 
                  value={exp.description} 
                  onChange={(e) => updateExperience(exp.id, "description", e.target.value)} 
                  placeholder="e.g. Em từng viết proposal, làm timeline, làm việc với khách hàng..." 
                  className="text-[13px] resize-none h-24 font-sans"
                />
              ) : (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Wand2 className="w-3.5 h-3.5" /> AI Improved Version
                  </div>
                  <Textarea 
                    value={exp.aiRewrite} 
                    onChange={(e) => updateExperience(exp.id, "aiRewrite", e.target.value)}
                    className="text-[13px] resize-none h-24 bg-white border-primary/20"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => updateExperience(exp.id, "aiRewrite", "")}>
                      Discard
                    </Button>
                    <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90 text-white" onClick={() => {
                      updateExperience(exp.id, "description", exp.aiRewrite);
                      updateExperience(exp.id, "aiRewrite", "");
                    }}>
                      Use This Version
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" className="w-full border-dashed" onClick={addExperience}>
        <Plus className="w-4 h-4 mr-2" /> Add Experience
      </Button>
    </div>
  );
}
