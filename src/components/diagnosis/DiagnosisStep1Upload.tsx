import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, CheckCircle2, Upload, History, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useAuthStore } from "@/store/useAuthStore";
import { JobDescriptionInput } from "./JobDescriptionInput";
import { useReviewCvMutation } from "@/hooks/use-diagnosis";
import { getApiErrorMessage } from "@/lib/api-error";

const IT_ROLES = [
  "Frontend",
  "Backend",
  "Fullstack",
  "Data Analyst",
  "Mobile",
  "DevOps",
  "QA/Tester",
  "AI/ML Engineer"
];

export function DiagnosisStep1Upload() {
  const {
    cvFile, jobDescription, isFromBuilder, builderCvName, targetRole,
    setCvFile, setTargetRole,
    setHasActivatedJdMode, setTargetStep, setLoadingProgress, setLoadingMsgIdx, setIsAnalyzing,
    setReviewData, setApiError, setAnalysisMode, setStep, clearBuilderState
  } = useDiagnosisStore();
  
  const { isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const reviewCvMutation = useReviewCvMutation();

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
    if (!cvFile && !isFromBuilder) { return toast({ title: "Missing CV", description: "Please upload or generate your CV first.", variant: "destructive" }); }
    if (!targetRole) { return toast({ title: "Missing Target Role", description: "Please select a target role first.", variant: "destructive" }); }

    setHasActivatedJdMode(false);
    setAnalysisMode("cv-only");
    setApiError(null);
    setReviewData(null);
    setTargetStep("cv-review");
    setLoadingProgress(0);
    setLoadingMsgIdx(0);
    setIsAnalyzing(true);

    try {
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
      return toast({ title: "Missing CV", description: "Please upload or generate your CV first.", variant: "destructive" });
    }
    if (!targetRole) {
      return toast({ title: "Missing Target Role", description: "Please select a target role first.", variant: "destructive" });
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
      {/* Auth Banner */}
      {!isAuthenticated && (
        <div className="flex items-center justify-between p-3 bg-[#FBF3DB] border border-[#F5E6BE] rounded-lg text-slate-700 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Đăng nhập để lưu lại lịch sử phân tích CV và so khớp JD của bạn.</span>
          </div>
          <Link to="/login" className="text-primary font-bold hover:underline shrink-0 ml-4">
            Đăng nhập ngay
          </Link>
        </div>
      )}

      {/* History Link */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-primary gap-2 font-medium text-sm">
          <History className="w-4 h-4" /> View Recent Scans
        </Button>
      </div>

      {/* Split Screen: CV Left | JD Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT: CV Upload or Builder State (2-Door Input) */}
        <Card className="glass border-white/50 shadow-sm overflow-hidden group relative flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 group-hover:opacity-100 opacity-50 transition-opacity" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary")}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base text-slate-800">Cung cấp CV của bạn</CardTitle>
                <CardDescription>Chọn cách thức cung cấp CV để tiến hành phân tích</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            {isFromBuilder ? (
              <div className="space-y-4 w-full">
                <p className="text-xs text-slate-600">
                  CV được tạo thành công từ AI CV Builder. Bạn có thể chỉnh sửa lại CV hoặc tiếp tục phân tích.
                </p>
                <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{builderCvName || "Generated_CV.pdf"}</p>
                      <p className="text-xs text-slate-500">Tạo từ AI CV Builder</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 text-xs rounded-lg border-primary text-primary hover:bg-primary/5 h-9" 
                    onClick={() => setStep("builder")}
                  >
                    Sửa CV trong Builder
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 text-xs rounded-lg text-red-500 border-red-200 hover:text-red-600 hover:bg-red-50 hover:border-red-300 h-9" 
                    onClick={() => { clearBuilderState(); setCvFile(null); }}
                  >
                    Xóa CV chọn lại
                  </Button>
                </div>
              </div>
            ) : cvFile ? (
              <div className="space-y-4 w-full">
                <p className="text-xs text-slate-600">
                  File CV đã sẵn sàng để phân tích chất lượng.
                </p>
                <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{cvFile.name}</p>
                      <p className="text-xs text-slate-500">{(cvFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full text-xs rounded-lg text-red-500 border-red-200 hover:text-red-600 hover:bg-red-50 hover:border-red-300 h-9" 
                    onClick={() => setCvFile(null)}
                  >
                    Xóa CV chọn lại
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Chọn một trong hai phương thức sau:</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Door 1: Upload */}
                  <label htmlFor="cv-upload-2door" className="border border-slate-200 bg-white rounded-xl p-4 flex flex-col justify-between min-h-[140px] transition-all hover:border-slate-300 cursor-pointer group/upload">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 group-hover/upload:text-primary transition-colors">
                        <Upload className="w-4 h-4 text-slate-400 group-hover/upload:text-primary" /> Tải lên CV có sẵn
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Tải file PDF, PNG, JPG từ thiết bị của bạn.
                      </p>
                    </div>
                    <div className="mt-3 inline-flex items-center justify-center w-full py-1.5 px-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors text-center">
                      Chọn file
                    </div>
                    <input id="cv-upload-2door" type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" onChange={handleCVUpload} />
                  </label>

                  {/* Door 2: AI Builder */}
                  <div className="border-2 border-primary bg-primary/5 rounded-xl p-4 flex flex-col justify-between min-h-[140px] transition-all hover:bg-primary/10">
                    <div className="space-y-1">
                      <h4 className="font-bold text-primary text-xs flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-primary" /> Tạo CV mới bằng AI
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Chưa có CV? Hãy tạo một bản CV chuyên nghiệp, chuẩn ATS.
                      </p>
                    </div>
                    <div className="mt-3">
                      <Button onClick={() => setStep("builder")} className="w-full h-8 text-[11px] font-semibold bg-primary hover:bg-primary/90 text-white rounded-lg">
                        Bắt đầu tạo
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: JD Input (reusable component) */}
        <JobDescriptionInput />
      </div>

      {/* Target Role Selector */}
      <div className="space-y-3 bg-slate-50/50 border border-slate-200/60 p-5 rounded-2xl">
        <label className="text-sm font-bold text-slate-800 block">
          Vị trí ứng tuyển mục tiêu (Target Role) <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {IT_ROLES.map((role) => {
            const isSelected = targetRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setTargetRole(isSelected ? null : role)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200",
                  isSelected
                    ? "bg-primary/15 border-primary text-primary shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {role}
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
        <Button 
          size="lg" 
          variant="outline" 
          onClick={analyzeCvOnly} 
          disabled={(!cvFile && !isFromBuilder) || !targetRole || reviewCvMutation.isPending}
          className={cn("rounded-lg px-8 text-sm font-semibold border-2 transition-all h-11",
            (cvFile || isFromBuilder) && targetRole ? "border-slate-300 hover:border-primary hover:text-primary hover:-translate-y-0.5" : "border-slate-200 text-slate-400 cursor-not-allowed"
          )}
        >
          <FileText className="mr-2 w-4 h-4" /> {isFromBuilder ? "Phân tích CV vừa tạo" : "Phân tích chất lượng CV"}
        </Button>
        <Button 
          size="lg" 
          onClick={analyzeWithJd} 
          disabled={(!cvFile && !isFromBuilder) || !targetRole || !jobDescription.trim() || reviewCvMutation.isPending}
          className={cn("rounded-lg px-8 text-sm font-semibold transition-all h-11",
            (cvFile || isFromBuilder) && targetRole && jobDescription.trim() ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5" : "bg-slate-200 text-slate-400 cursor-not-allowed"
          )}
        >
          <Sparkles className="mr-2 w-4 h-4" /> {isFromBuilder ? "So khớp CV vừa tạo với JD" : "So khớp CV với JD"}
        </Button>
      </div>

      {/* Helper text */}
      <p className="text-center text-xs text-slate-400 mt-1">Cung cấp CV và chọn Vị trí ứng tuyển mục tiêu để bắt đầu</p>
    </div>
  );
}
