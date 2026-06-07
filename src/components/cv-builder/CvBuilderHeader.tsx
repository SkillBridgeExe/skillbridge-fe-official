import { Button } from "@/components/ui/button";
import { Download, BrainCircuit, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAutosaveStore } from "@/store/useAutosaveStore";
import { useTranslation } from "react-i18next";

export function CvBuilderHeader() {
  const { t } = useTranslation("diagnosis");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { saveStatus, lastSavedTime, triggerSaveRef } = useAutosaveStore();

  const handleSaveDraft = () => {
    if (triggerSaveRef.current) {
      triggerSaveRef.current();
    } else {
      toast({
        title: "Draft Saved",
        description: "Your CV draft has been saved successfully.",
      });
    }
  };

  const handleDownload = () => {
    toast({
      title: "Generating PDF",
      description: "Preparing your CV for download...",
    });
  };

  const handleAnalyze = () => {
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
        {saveStatus === "local" ? (
          <span className="text-xs text-[#787774] max-w-[280px] text-right font-medium">
            {t("builder.localOnly")}
          </span>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              className="gap-2 min-w-[125px]"
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                  <span>{t("builder.saving")}</span>
                </>
              ) : saveStatus === "saved" && lastSavedTime ? (
                <>
                  <Save className="w-4 h-4 text-emerald-500" />
                  <span>{t("builder.savedAt", { time: lastSavedTime })}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Draft</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download CV</span>
            </Button>

            <Button
              onClick={handleAnalyze}
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-md"
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Analyze CV</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
