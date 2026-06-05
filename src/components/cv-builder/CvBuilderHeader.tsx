import { Button } from "@/components/ui/button";
import { Download, BrainCircuit, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export function CvBuilderHeader() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSaveDraft = () => {
    toast({
      title: "Draft Saved",
      description: "Your CV draft has been saved successfully.",
    });
  };

  const handleDownload = () => {
    toast({
      title: "Generating PDF",
      description: "Preparing your CV for download...",
    });
    // TODO: Implement actual PDF generation
  };

  const handleAnalyze = () => {
    // Navigate to /diagnosis with source=builder
    // The store should retain its state, so when they come back it's still there.
    navigate("/diagnosis?source=builder");
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <BrainCircuit className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 leading-tight">SkillBridge CV Builder</h1>
          <p className="text-[11px] text-slate-500 font-medium">Build a professional, ATS-friendly CV from your profile.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleSaveDraft} className="gap-2">
          <Save className="w-4 h-4" /> Save Draft
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
          <Download className="w-4 h-4" /> Download CV
        </Button>
        <Button onClick={handleAnalyze} size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-md">
          <BrainCircuit className="w-4 h-4" /> Analyze CV
        </Button>
      </div>
    </header>
  );
}
