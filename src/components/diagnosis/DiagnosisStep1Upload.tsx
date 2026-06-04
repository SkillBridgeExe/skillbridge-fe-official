import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, CheckCircle2, Upload, X, History, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { JobDescriptionInput } from "./JobDescriptionInput";
import { useReviewCvMutation } from "@/hooks/use-diagnosis";
import { getApiErrorMessage } from "@/lib/api-error";

export function DiagnosisStep1Upload() {
  const {
    cvFile, jobDescription, isFromBuilder, builderCvName, builderCvId,
    setCvFile, clearBuilderState,
    setHasActivatedJdMode, setTargetStep, setLoadingProgress, setLoadingMsgIdx, setIsAnalyzing,
    setReviewData, setApiError, setAnalysisMode, setStep
  } = useDiagnosisStore();
  
  const { toast } = useToast();
  const reviewCvMutation = useReviewCvMutation();
  const navigate = useNavigate();

  const handleCVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    const validExts = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
    const ext = file?.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (file && (validTypes.includes(file.type) || validExts.includes(ext ?? ""))) {
      setCvFile(file);
      toast({ title: "✅ CV Uploaded", description: file.name });
    } else {
      toast({ title: "Invalid File", description: "Please upload PDF, PNG, JPG, or WEBP.", variant: "destructive" });
    }
  };

  const analyzeCvOnly = async () => {
    if (!cvFile && !isFromBuilder) { return toast({ title: "Missing CV", description: "Please upload your resume first.", variant: "destructive" }); }

    setHasActivatedJdMode(false);
    setAnalysisMode("cv-only");
    setApiError(null);
    setReviewData(null);
    setTargetStep("cv-review");
    setLoadingProgress(0);
    setLoadingMsgIdx(0);
    setIsAnalyzing(true);

    try {
      // Mocking the builder CV case for now since we don't have a real file payload
      // In reality, you'd send `cvFile` or `builderCvId` to the backend.
      const payload = isFromBuilder ? { cvFile: new File(["mock"], "generated.pdf") } : { cvFile: cvFile! };
      const data = await reviewCvMutation.mutateAsync(payload);
      setReviewData(data);
      setStep("cv-review");
    } catch (error) {
      const message = getApiErrorMessage(error, "Failed to analyze CV.");
      setApiError(message);
      toast({ title: "Analysis Failed", description: message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
      setLoadingProgress(0);
    }
  };

  const analyzeWithJd = async () => {
    if (!cvFile && !isFromBuilder) {
      return toast({ title: "Missing CV", description: "Please upload your resume first.", variant: "destructive" });
    }
    if (!jobDescription.trim()) {
      return toast({ title: "Missing Job", description: "Please paste the job description text first.", variant: "destructive" });
    }

    setAnalysisMode("cv-jd");
    setApiError(null);
    setReviewData(null);
    setTargetStep("results");
    setLoadingProgress(0);
    setLoadingMsgIdx(0);
    setIsAnalyzing(true);

    try {
      const payload = isFromBuilder ? { cvFile: new File(["mock"], "generated.pdf"), jobDescription: jobDescription.trim() } : { cvFile: cvFile!, jobDescription: jobDescription.trim() };
      const data = await reviewCvMutation.mutateAsync(payload);
      setReviewData(data);
      setHasActivatedJdMode(true);
      setStep("results");
    } catch (error) {
      const message = getApiErrorMessage(error, "Failed to compare CV with JD.");
      setHasActivatedJdMode(false);
      setApiError(message);
      toast({ title: "Analysis Failed", description: message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
      setLoadingProgress(0);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-400">
      {/* History Link */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-primary gap-2 font-medium text-sm">
          <History className="w-4 h-4" /> View Recent Scans
        </Button>
      </div>

      {/* Split Screen: CV Left | JD Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT: CV Upload or Builder State */}
        <Card className="glass border-white/50 shadow-sm overflow-hidden group relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 group-hover:opacity-100 opacity-50 transition-opacity" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isFromBuilder ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary")}>
                  {isFromBuilder ? <Sparkles className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div>
                  <CardTitle className="text-base text-slate-800">{isFromBuilder ? "Generated CV Selected" : "Your Resume"}</CardTitle>
                  <CardDescription>{isFromBuilder ? "Created with AI Builder" : "PDF or Image (PNG, JPG, WEBP) — Max 5MB"}</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isFromBuilder ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Your CV has been created with SkillBridge AI Builder. We'll use this CV for analysis, so you don't need to upload it again.
                </p>
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{builderCvName || "Generated_CV.pdf"}</p>
                    <p className="text-xs text-slate-500">Created from AI CV Builder</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/*
                  <Button variant="outline" className="flex-1 text-sm rounded-full">Preview CV</Button>
                  <Button variant="outline" className="flex-1 text-sm rounded-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { clearBuilderState(); setCvFile(null); }}>Replace CV</Button>
                  */}
                  <Button 
                    variant="outline" 
                    className="flex-1 text-sm rounded-full border-primary text-primary hover:bg-primary/5" 
                    onClick={() => navigate("/cv-builder")}
                  >
                    Back to Edit CV
                  </Button>
                </div>
              </div>
            ) : cvFile ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{cvFile.name}</p>
                  <p className="text-xs text-slate-500">{(cvFile.size / 1024 / 1024).toFixed(2)} MB · Ready for scan</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setCvFile(null)} className="rounded-full hover:bg-red-50 hover:text-red-500 shrink-0" aria-label="Remove file">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label htmlFor="cv-upload" className="flex flex-col items-center justify-center w-full h-[180px] border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-2xl cursor-pointer hover:bg-primary/5 hover:border-primary/40 transition-all group/drop">
                <Upload className="w-9 h-9 text-slate-300 group-hover/drop:text-primary mb-3 transition-colors" />
                <p className="text-sm text-slate-500"><span className="font-semibold text-primary">Click to select file</span> or drag & drop</p>
                <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG, WEBP (Max 5MB)</p>
                <input id="cv-upload" type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" onChange={handleCVUpload} aria-label="Upload your CV" />
              </label>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: JD Input (reusable component) */}
        <JobDescriptionInput />
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
        <Button size="lg" variant="outline" onClick={analyzeCvOnly} disabled={(!cvFile && !isFromBuilder) || reviewCvMutation.isPending}
          className={cn("rounded-full px-8 text-sm font-semibold border-2 transition-all",
            (cvFile || isFromBuilder) ? "border-slate-300 hover:border-primary hover:text-primary hover:-translate-y-0.5" : "border-slate-200 text-slate-400 cursor-not-allowed"
          )}>
          <FileText className="mr-2 w-4 h-4" /> {isFromBuilder ? "Analyze Generated CV" : "Analyze CV Quality Only"}
        </Button>
        <Button size="lg" onClick={analyzeWithJd} disabled={(!cvFile && !isFromBuilder) || !jobDescription.trim() || reviewCvMutation.isPending}
          className={cn("rounded-full px-8 text-sm font-semibold transition-all",
            (cvFile || isFromBuilder) && jobDescription.trim() ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5" : "bg-slate-200 text-slate-400 cursor-not-allowed"
          )}>
          <Sparkles className="mr-2 w-4 h-4" /> {isFromBuilder ? "Compare Generated CV against JD" : "Compare CV against JD"}
        </Button>
      </div>

      {/* Helper text */}
      <p className="text-center text-xs text-slate-400 mt-1">Upload your CV to get started</p>
    </div>
  );
}
