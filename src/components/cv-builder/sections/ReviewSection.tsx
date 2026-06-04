import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

export function ReviewSection() {
  const { getCompletionPercent, getSectionStatuses, setActiveSection } = useCvBuilderStore();
  
  const completion = getCompletionPercent();
  const statuses = getSectionStatuses();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "needs-improvement": return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "missing": return <XCircle className="w-4 h-4 text-slate-300" />;
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="text-center space-y-2 mb-6">
        <h3 className="text-xl font-bold text-slate-800">CV Completion Score</h3>
        <div className="text-4xl font-black text-primary">{completion}%</div>
        <Progress value={completion} className="h-2 w-full max-w-xs mx-auto" />
      </div>

      <div className="space-y-3">
        {statuses.map((section, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
            <div className="flex items-center gap-3">
              {getStatusIcon(section.status)}
              <span className="font-medium text-slate-700 text-sm">{section.label}</span>
            </div>
            {section.status !== "completed" && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => setActiveSection(idx)}>
                Fix
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
