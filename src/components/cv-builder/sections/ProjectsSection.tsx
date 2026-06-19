import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Plus, Trash2, Sparkles, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAiRewrite } from "@/hooks/use-cv-builder";
import type { AiGateCode } from "@/lib/ai-input-gate";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "react-i18next";

/** Instruction cho mode 'custom' của BE rewrite (≤500 ký tự). */
const BULLETS_INSTRUCTION =
  "Chuyển nội dung thành 2-4 gạch đầu dòng CV (mỗi dòng bắt đầu bằng '- '), súc tích, giữ nguyên dữ kiện, không bịa thông tin mới.";

type ProjectNotice = AiGateCode | "LOCAL_ONLY" | "FALLBACK";

export function ProjectsSection() {
  const { projects, addProject, updateProject, removeProject, draftId, clearSectionEvaluation } = useCvBuilderStore();
  const { toast } = useToast();
  const { t } = useTranslation("diagnosis");

  // Per-entry trạng thái: hint gate/fallback + backup để hoàn tác sau khi áp AI
  const [notice, setNotice] = useState<{ id: string; kind: ProjectNotice } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [backupMap, setBackupMap] = useState<Record<string, string>>({});

  const aiRewrite = useAiRewrite();
  // Số lần "Chuyển thành gạch đầu dòng" theo project id → token variant để BE bỏ cache.
  const attempts = useRef<Record<string, number>>({});
  const targetRole = useDiagnosisStore((s) => s.targetRole);
  const isLoggedIn = useAuthStore(
    (state) => state.authStatus === "authenticated" && state.authSource === "api",
  );

  const noticeText = (kind: ProjectNotice) => {
    switch (kind) {
      case "LOCAL_ONLY":
        return t("builder.localOnly");
      case "FALLBACK":
        return t("builder.aiGate.fallbackNote");
      case "OFF_TOPIC":
        return t("builder.aiGate.offTopic");
      default:
        return t("builder.aiGate.needContext");
    }
  };

  /**
   * "Chuyển thành gạch đầu dòng" THẬT: gửi chính mô tả user đã viết qua BE
   * rewrite (mode 'custom'). Không còn template giả ghi đè nội dung.
   */
  const suggestBullets = (id: string, currentText: string) => {
    if (!currentText.trim()) {
      return toast({ title: t("builder.toastWriteTextFirst"), variant: "destructive" });
    }

    setNotice(null);
    if (!isLoggedIn || !draftId) {
      return setNotice({ id, kind: "LOCAL_ONLY" });
    }

    setPendingId(id);
    // Lần đầu cho 1 project = cache; bấm lại (kể cả sau Undo, cùng input) = variant mới.
    const n = attempts.current[id] ?? 0;
    attempts.current[id] = n + 1;

    aiRewrite.rewrite(
      {
        draftId,
        text: currentText,
        mode: "custom",
        instruction: BULLETS_INSTRUCTION,
        role_code: targetRole ?? undefined,
        section: "projects",
        ...(n > 0 ? { variant: String(n) } : {}),
      },
      {
        onSuccess: (data) => {
          setPendingId(null);
          setBackupMap((prev) => ({ ...prev, [id]: currentText }));
          updateProject(id, "description", data.suggestion);
          clearSectionEvaluation("projects");
          if (data.fallback) setNotice({ id, kind: "FALLBACK" });
        },
        onGateFail: (reason) => {
          setPendingId(null);
          setNotice({ id, kind: reason });
        },
        onError: (err: Error) => {
          setPendingId(null);
          toast({
            title: t("builder.toastAiSuggestFailed"),
            description: err?.message || t("builder.toastSomethingWrong"),
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleUndo = (id: string) => {
    const backup = backupMap[id];
    if (backup === undefined) return;
    updateProject(id, "description", backup);
    setBackupMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setNotice(null);
  };

  return (
    <div className="space-y-6 p-4">
      {projects.map((proj, index) => (
        <div key={proj.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 relative group">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm text-slate-700">{t("builder.entry.project")} #{index + 1}</h4>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeProject(proj.id)} disabled={projects.length === 1}
              aria-label={`${t("builder.remove")} ${t("builder.entry.project")} ${index + 1}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>{t("builder.fields.projectName")} *</Label>
              <Input value={proj.name} onChange={(e) => updateProject(proj.id, "name", e.target.value)} placeholder={t("builder.ph.projectName")} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>{t("builder.fields.role")}</Label>
              <Input value={proj.role} onChange={(e) => updateProject(proj.id, "role", e.target.value)} placeholder={t("builder.ph.role")} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{t("builder.fields.tools")}</Label>
              <Input value={proj.tools} onChange={(e) => updateProject(proj.id, "tools", e.target.value)} placeholder={t("builder.ph.tools")} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{t("builder.fields.projectLink")}</Label>
              <Input
                type="url"
                value={proj.link}
                onChange={(e) => updateProject(proj.id, "link", e.target.value)}
                placeholder={t("builder.ph.projectLink")}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <div className="flex items-center justify-between">
                <Label>{t("builder.fields.projectDescription")}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary"
                  onClick={() => suggestBullets(proj.id, proj.description)}
                  disabled={aiRewrite.isPending && pendingId === proj.id}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {aiRewrite.isPending && pendingId === proj.id
                    ? t("builder.generating")
                    : t("builder.turnIntoBullets")}
                </Button>
              </div>
              <Textarea
                value={proj.description}
                onChange={(e) => updateProject(proj.id, "description", e.target.value)}
                placeholder={t("builder.ph.projectDescription")}
                className="text-[13px] resize-none h-20"
              />

              {/* Input-gate hint / fallback note */}
              {notice?.id === proj.id && (
                <div className="text-[11px] text-[#8C6D1F] bg-[#FBF3DB]/60 border border-[#F2E5BC] rounded-lg p-2.5 leading-relaxed">
                  {noticeText(notice.kind)}
                </div>
              )}

              {/* Hoàn tác sau khi áp bản viết lại của AI */}
              {backupMap[proj.id] !== undefined && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUndo(proj.id)}
                  className="h-7 text-xs border-amber-500 text-amber-600 hover:bg-amber-50 gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t("builder.undo")}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" className="w-full border-dashed" onClick={addProject}>
        <Plus className="w-4 h-4 mr-2" /> {t("builder.add.project")}
      </Button>
    </div>
  );
}
