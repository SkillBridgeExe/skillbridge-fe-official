import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { getCvDetailApi } from "@/api/cv/list";
import {
  useResumeListQuery,
  useDeleteResumeMutation,
  useDuplicateResumeMutation,
} from "@/hooks/use-resume-library";
import { useToast } from "@/hooks/use-toast";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  FileText,
  MoreVertical,
  Copy,
  Trash2,
  Loader2,
  FolderOpen,
} from "lucide-react";
import type { CvListItemDto } from "@shared/api";

function formatRelativeTime(dateStr: string, t: TFunction<"diagnosis">): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t("builder.resumeLibrary.time.justNow");
  if (minutes < 60) return t("builder.resumeLibrary.time.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("builder.resumeLibrary.time.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("builder.resumeLibrary.time.daysAgo", { count: days });
  return new Date(dateStr).toLocaleDateString();
}

function ResumeCard({
  item,
  onOpen,
  onDuplicate,
  onDelete,
  isOpening = false,
}: {
  item: CvListItemDto;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isOpening?: boolean;
}) {
  const { t } = useTranslation("diagnosis");
  const displayTitle = item.title || t("builder.studio.untitledResume");

  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden">
      {/* Card top — accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-primary/60 to-primary/20" />

      <div className="p-4">
        {/* Icon + Title */}
        <div className="flex items-start gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-primary/70" />
          </div>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onOpen}
              disabled={isOpening}
              className="text-sm font-semibold text-slate-800 hover:text-primary transition-colors truncate block w-full text-left"
              title={displayTitle}
            >
              <span className="inline-flex min-w-0 items-center gap-1.5">
                {isOpening ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : null}
                <span className="truncate">{displayTitle}</span>
              </span>
            </button>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t("builder.resumeLibrary.lastEdited", {
                time: formatRelativeTime(item.createdAt, t),
              })}
            </p>
          </div>

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={t("builder.resumeLibrary.actionMenu")}
                disabled={isOpening}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onOpen}>
                <FolderOpen className="h-3.5 w-3.5 mr-2" />
                {t("builder.resumeLibrary.open")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-3.5 w-3.5 mr-2" />
                {t("builder.resumeLibrary.duplicate")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                {t("builder.resumeLibrary.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {item.targetRole && (
            <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
              {item.targetRole}
            </span>
          )}
          {item.language && (
            <span className="text-[10px] font-medium bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded uppercase">
              {item.language}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResumeLibrary() {
  const { t } = useTranslation("diagnosis");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setStep, clearBuilderState } = useDiagnosisStore();
  const { data, isLoading, isError } = useResumeListQuery();
  const deleteMutation = useDeleteResumeMutation();
  const duplicateMutation = useDuplicateResumeMutation();

  const [deleteTarget, setDeleteTarget] = useState<CvListItemDto | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const handleOpenResume = useCallback(
    async (item: CvListItemDto) => {
      setOpeningId(item.id);
      try {
        const detail = await getCvDetailApi(item.id);
        if (!detail.parsedJson) {
          toast({
            title: t("builder.resumeLibrary.openFailed"),
            description: t("builder.resumeLibrary.openFailedDesc"),
            variant: "destructive",
          });
          return;
        }

        const initialTitle = detail.title || item.title || t("builder.studio.untitledResume");
        const builder = useCvBuilderStore.getState();
        builder.reset();
        builder.hydrateFromCanonical(detail.parsedJson);
        const hydrated = useCvBuilderStore.getState();
        hydrated.setDraftId(detail.id);
        hydrated.setResumeTitle(initialTitle);
        hydrated.setSeededFromDiagnosis(false);
        hydrated.setSeedSourceCvId(null);
        clearBuilderState();
        setStep("builder");
        navigate(`/diagnosis?mode=builder&cvId=${encodeURIComponent(item.id)}`);
      } catch {
        toast({
          title: t("builder.resumeLibrary.openFailed"),
          description: t("builder.resumeLibrary.openFailedDesc"),
          variant: "destructive",
        });
      } finally {
        setOpeningId(null);
      }
    },
    [clearBuilderState, navigate, setStep, t, toast],
  );

  const handleCreateNew = useCallback(() => {
    useCvBuilderStore.getState().reset();
    clearBuilderState();
    setStep("builder");
    navigate("/diagnosis?mode=builder&new=1");
  }, [clearBuilderState, navigate, setStep]);

  const handleDuplicate = useCallback(
    (item: CvListItemDto) => {
      const title = t("builder.resumeLibrary.copyOfTitle", {
        name: item.title || t("builder.studio.untitledResume"),
      });
      duplicateMutation.mutate(
        { sourceCvId: item.id, title },
        {
          onSuccess: () => {
            toast({
              title: t("builder.resumeLibrary.duplicateSuccess"),
            });
          },
        },
      );
    },
    [duplicateMutation, toast, t],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: t("builder.resumeLibrary.deleteSuccess") });
        setDeleteTarget(null);
      },
    });
  }, [deleteTarget, deleteMutation, toast, t]);

  const items = data?.items ?? [];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 min-h-[calc(100dvh-80px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t("builder.resumeLibrary.title")}
            </h1>
          </div>
          <Button onClick={handleCreateNew} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            {t("builder.resumeLibrary.createNew")}
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-slate-500">{t("builder.resumeLibrary.loadError")}</p>
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-primary/50" />
            </div>
            <h2 className="text-lg font-semibold text-slate-700 mb-1">
              {t("builder.resumeLibrary.empty")}
            </h2>
            <Button onClick={handleCreateNew} className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" />
              {t("builder.resumeLibrary.emptyAction")}
            </Button>
          </div>
        ) : (
          /* Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <ResumeCard
                key={item.id}
                item={item}
                onOpen={() => handleOpenResume(item)}
                onDuplicate={() => handleDuplicate(item)}
                onDelete={() => setDeleteTarget(item)}
                isOpening={openingId === item.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("builder.resumeLibrary.confirmDeleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("builder.resumeLibrary.confirmDeleteDesc", {
                name:
                  deleteTarget?.title ||
                  t("builder.studio.untitledResume"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("builder.resumeLibrary.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              {t("builder.resumeLibrary.confirmDeleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
