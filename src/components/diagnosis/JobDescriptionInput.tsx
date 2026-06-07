import type { ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Briefcase, CheckCircle2, X, Type, FileUp, Sparkles, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

interface JobDescriptionInputProps {
  // If true, shows "Cancel" and "Analyze Skill Gap" buttons at the bottom.
  // If false, it's just the input form (used in Step 1 where actions are outside).
  showActions?: boolean;
  onCancel?: () => void;
  onAnalyze?: () => void;
  compact?: boolean;
}

export function JobDescriptionInput({ showActions = false, onCancel, onAnalyze, compact = false }: JobDescriptionInputProps) {
  const {
    jdFile, jdInputMode, jobDescription,
    setJdFile, setJdInputMode, setJobDescription,
  } = useDiagnosisStore();
  
  const { toast } = useToast();
  const { t } = useTranslation("diagnosis");

  const handleJDUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isTxt = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.toLowerCase().endsWith(".docx");

    if (isTxt) {
      const text = await file.text();
      const normalized = text.trim();

      setJdFile(file);
      setJobDescription(normalized);

      if (!normalized) {
        toast({
          title: t("jdInput.toastEmptyTitle"),
          description: t("jdInput.toastEmptyDesc"),
          variant: "destructive",
        });
        return;
      }

      toast({ title: t("jdInput.toastUploadedTitle"), description: t("jdInput.toastUploadedDesc", { fileName: file.name }) });
      return;
    }

    if (isPdf || isDocx) {
      setJdFile(file);
      setJobDescription("");
      toast({
        title: t("jdInput.toastUploadedTitle"),
        description: t("jdInput.toastExtractOffDesc"),
      });
      return;
    }

    toast({ title: t("jdInput.toastInvalidTitle"), description: t("jdInput.toastInvalidDesc"), variant: "destructive" });
  };

  const handleRemoveJDFile = () => {
    setJdFile(null);
    setJobDescription("");
  };

  const Wrapper = compact ? motion.div : Card;
  const wrapperProps = compact ? {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    className: "space-y-4 p-6 bg-[#FBFBFA] rounded-xl border border-[#EAEAEA] shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
  } : {
    className: "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] relative overflow-hidden group"
  };

  return (
    <Wrapper {...wrapperProps}>
      {/* No decorative elements in §0b */}
      
      {/* Header Area */}
      {compact ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-slate-900">{t("jdInput.titleCompact")}</h3>
          </div>
          {/* Tab toggle */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            <button
              onClick={() => setJdInputMode("paste")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                jdInputMode === "paste" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Type className="w-3.5 h-3.5" /> {t("jdInput.tabPaste")}
            </button>
            <button
              onClick={() => setJdInputMode("file")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                jdInputMode === "file" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <FileUp className="w-3.5 h-3.5" /> {t("jdInput.tabUpload")}
            </button>
          </div>
        </div>
      ) : (
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Briefcase className="text-blue-500 w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base text-slate-800">
                  {t("jdInput.title")} <span className="text-slate-400 font-normal">{t("jdInput.optional")}</span>
                </CardTitle>
                <CardDescription>{t("jdInput.subtitle")}</CardDescription>
              </div>
            </div>
            {/* Tab toggle */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
              <button
                onClick={() => setJdInputMode("paste")}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                  jdInputMode === "paste" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Type className="w-3.5 h-3.5" /> {t("jdInput.tabPaste")}
              </button>
              <button
                onClick={() => setJdInputMode("file")}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                  jdInputMode === "file" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <FileUp className="w-3.5 h-3.5" /> {t("jdInput.tabUpload")}
              </button>
            </div>
          </div>
        </CardHeader>
      )}

      {/* Content Area */}
      {compact ? (
        <div className="pt-2">
          {jdInputMode === "paste" ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <label htmlFor="jd-input-compact" className="sr-only">{t("jdInput.title")}</label>
              <textarea
                id="jd-input-compact"
                className="w-full h-[180px] p-4 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all text-[13px] resize-none font-sans"
                placeholder={t("jdInput.placeholderCompact")}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                autoFocus
              />
            </motion.div>
          ) : jdFile ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{jdFile.name}</p>
                <p className="text-xs text-slate-500">
                  {(jdFile.size / 1024 / 1024).toFixed(2)} MB · {jobDescription.trim() ? t("jdInput.fileReady") : t("jdInput.fileNeedsText")}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleRemoveJDFile} className="rounded-full hover:bg-red-50 hover:text-red-500 shrink-0" aria-label="Remove file">
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <label className="flex flex-col items-center justify-center w-full h-[180px] border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-xl cursor-pointer hover:bg-primary/5 hover:border-primary/40 transition-all group/drop">
                <FileUp className="w-9 h-9 text-slate-300 mb-3 group-hover/drop:text-primary transition-colors" />
                <p className="text-sm text-slate-500"><span className="font-semibold text-primary">{t("jdInput.dropHint").split(" or ")[0]?.split("hoặc")[0]}</span></p>
                <p className="text-xs text-slate-400 mt-1">{t("jdInput.dropTypes")}</p>
                <input type="file" className="hidden" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={handleJDUpload} aria-label={t("jdInput.tabUpload")} />
              </label>
            </motion.div>
          )}
        </div>
      ) : (
        <CardContent>
          {jdInputMode === "paste" ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <label htmlFor="jd-input-full" className="sr-only">{t("jdInput.title")}</label>
              <textarea
                id="jd-input-full"
                className="w-full h-[180px] p-4 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none transition-all text-sm resize-none placeholder:text-slate-400 font-sans leading-relaxed"
                placeholder={t("jdInput.placeholder")}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </motion.div>
          ) : jdFile ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{jdFile.name}</p>
                <p className="text-xs text-slate-500">
                  {(jdFile.size / 1024 / 1024).toFixed(2)} MB · {jobDescription.trim() ? t("jdInput.fileReady") : t("jdInput.fileNeedsText")}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleRemoveJDFile} className="rounded-full hover:bg-red-50 hover:text-red-500 shrink-0" aria-label="Remove file">
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <label className="flex flex-col items-center justify-center w-full h-[180px] border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-xl cursor-pointer hover:bg-primary/5 hover:border-primary/40 transition-all group/drop">
                <FileUp className="w-9 h-9 text-slate-300 mb-3 group-hover/drop:text-primary transition-colors" />
                <p className="text-sm text-slate-500"><span className="font-semibold text-primary">{t("jdInput.dropHint").split(" or ")[0]?.split("hoặc")[0]}</span></p>
                <p className="text-xs text-slate-400 mt-1">{t("jdInput.dropTypes")}</p>
                <input type="file" className="hidden" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={handleJDUpload} aria-label={t("jdInput.tabUpload")} />
              </label>
            </motion.div>
          )}
        </CardContent>
      )}

      {/* Action Buttons (for Step 2) */}
      {showActions && (
        <div className={cn("flex gap-3 justify-end items-center", compact ? "mt-2" : "p-4 pt-0")}>
          <Button variant="ghost" onClick={onCancel} className="rounded-full text-sm font-semibold hover:bg-slate-200">
            {t("jdInput.cancel")}
          </Button>
          <Button
            onClick={onAnalyze}
            disabled={!jobDescription.trim()}
            className="rounded-full px-8 bg-primary hover:bg-primary/90 text-white font-bold gap-2 shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
          >
            <Sparkles className="w-4 h-4" /> {t("jdInput.analyze")} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Wrapper>
  );
}
