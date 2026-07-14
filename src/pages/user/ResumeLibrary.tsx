import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { getCvDetailApi } from "@/api/cv/list";
import {
  useResumeListQuery,
  useDeleteResumeMutation,
  useDuplicateResumeMutation,
  useRenameResumeMutation,
} from "@/hooks/use-resume-library";
import { useToast } from "@/hooks/use-toast";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Edit2,
  Search,
  Filter,
  ArrowDownAZ,
  Clock,
} from "lucide-react";
import type { CvListItemDto } from "@shared/api";

type ResumeSortKey = "newest" | "oldest" | "title";

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
  onRename,
  isOpening = false,
  isDuplicating = false,
}: {
  item: CvListItemDto;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: () => void;
  isOpening?: boolean;
  isDuplicating?: boolean;
}) {
  const { t } = useTranslation("diagnosis");
  const displayTitle = item.title || t("builder.studio.untitledResume");

  return (
    <div className="group relative bg-white rounded-xl shadow-sm ring-1 ring-slate-100 hover:ring-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden flex flex-col h-full">
      {/* Card top — accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary/40 to-primary/10 shrink-0" />

      <div className="p-4 flex flex-col flex-1">
        {/* Icon + Title */}
        <div className="flex items-start gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-primary/70" />
          </div>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onOpen}
              disabled={isOpening || isDuplicating}
              className="text-sm font-semibold text-slate-800 hover:text-primary transition-colors truncate block w-full text-left"
              title={displayTitle}
            >
              <span className="inline-flex min-w-0 items-center gap-1.5">
                {(isOpening || isDuplicating) && (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                )}
                <span className="truncate">{displayTitle}</span>
              </span>
            </button>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t("builder.resumeLibrary.lastEdited", {
                time: formatRelativeTime(item.updatedAt || item.createdAt, t),
              })}
            </p>
          </div>

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                aria-label={t("builder.resumeLibrary.actionMenu")}
                disabled={isOpening || isDuplicating}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onOpen}>
                <FolderOpen className="h-3.5 w-3.5 mr-2" />
                {t("builder.resumeLibrary.open")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename}>
                <Edit2 className="h-3.5 w-3.5 mr-2" />
                {t("builder.resumeLibrary.rename")}
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

        <div className="flex-1" />

        {/* Meta tags */}
        <div className="flex items-center gap-2 flex-wrap mt-2">
          {item.targetRole && (
            <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded truncate max-w-full">
              {item.targetRole}
            </span>
          )}
          {item.language && (
            <span className="text-[10px] font-medium bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded uppercase shrink-0">
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
  const { data, isLoading, isError, refetch } = useResumeListQuery();
  const deleteMutation = useDeleteResumeMutation();
  const duplicateMutation = useDuplicateResumeMutation();
  const renameMutation = useRenameResumeMutation();

  const [deleteTarget, setDeleteTarget] = useState<CvListItemDto | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLang, setFilterLang] = useState<string>("all");
  const [sortBy, setSortBy] = useState<ResumeSortKey>("newest");

  // Rename state
  const [renameTarget, setRenameTarget] = useState<CvListItemDto | null>(null);
  const [renameValue, setRenameValue] = useState("");

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
        builder.hydrateFromCanonical(detail.parsedJson, { cvId: detail.id });
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
      setDuplicatingId(item.id);
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
          onSettled: () => setDuplicatingId(null),
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

  const handleConfirmRename = useCallback(() => {
    if (!renameTarget || !renameValue.trim()) return;
    renameMutation.mutate(
      { id: renameTarget.id, title: renameValue.trim() },
      {
        onSuccess: () => {
          toast({ title: t("builder.resumeLibrary.renameSuccess") });
          setRenameTarget(null);
        },
        onError: () => {
          toast({
            title: t("builder.resumeLibrary.renameFailed"),
            variant: "destructive",
          });
        },
      }
    );
  }, [renameTarget, renameValue, renameMutation, toast, t]);

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  // Get unique languages for filter
  const languages = useMemo(() => {
    const langs = new Set<string>();
    items.forEach((item) => {
      if (item.language) langs.add(item.language);
    });
    return Array.from(langs).sort();
  }, [items]);

  // Derived state: Filter & Sort
  const displayItems = useMemo(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.targetRole?.toLowerCase().includes(q)
      );
    }

    if (filterLang !== "all") {
      result = result.filter((i) => i.language === filterLang);
    }

    result.sort((a, b) => {
      if (sortBy === "title") {
        const titleA = a.title || "";
        const titleB = b.title || "";
        return titleA.localeCompare(titleB);
      }
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return sortBy === "newest" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [items, searchQuery, filterLang, sortBy]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 min-h-[calc(100dvh-80px)] flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {t("builder.resumeLibrary.title")}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {t("builder.resumeLibrary.subtitle")}
            </p>
          </div>
          <Button onClick={handleCreateNew} size="sm" className="gap-1.5 shrink-0 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            {t("builder.resumeLibrary.createNew")}
          </Button>
        </div>

        {/* Toolbar */}
        {items.length > 0 && !isLoading && !isError && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t("builder.resumeLibrary.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>

            <div className="flex gap-2">
              <Select value={filterLang} onValueChange={setFilterLang}>
                <SelectTrigger className="w-[140px] bg-white">
                  <Filter className="h-3.5 w-3.5 mr-2 text-slate-400" />
                  <SelectValue placeholder={t("builder.resumeLibrary.filterLang")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("builder.resumeLibrary.allLanguages")}</SelectItem>
                  {languages.map((l) => (
                    <SelectItem key={l} value={l} className="uppercase">
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(val) => setSortBy(val as ResumeSortKey)}>
                <SelectTrigger className="w-[160px] bg-white">
                  {sortBy === "title" ? (
                    <ArrowDownAZ className="h-3.5 w-3.5 mr-2 text-slate-400" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 mr-2 text-slate-400" />
                  )}
                  <SelectValue placeholder={t("builder.resumeLibrary.sortBy")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("builder.resumeLibrary.sortNewest")}</SelectItem>
                  <SelectItem value="oldest">{t("builder.resumeLibrary.sortOldest")}</SelectItem>
                  <SelectItem value="title">{t("builder.resumeLibrary.sortTitle")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[120px] rounded-xl border border-slate-100 bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 rounded-2xl flex-1">
            <p className="text-slate-500 mb-4">{t("builder.resumeLibrary.loadError")}</p>
            <Button onClick={() => refetch()} variant="outline">
              {t("builder.resumeLibrary.retry")}
            </Button>
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 flex-1">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              {t("builder.resumeLibrary.empty")}
            </h2>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              {t("builder.resumeLibrary.emptyDesc")}
            </p>
            <Button onClick={handleCreateNew} className="gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" />
              {t("builder.resumeLibrary.emptyAction")}
            </Button>
          </div>
        ) : displayItems.length === 0 ? (
          /* No search results */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">{t("builder.resumeLibrary.noSearchResults")}</p>
          </div>
        ) : (
          /* Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayItems.map((item) => (
              <ResumeCard
                key={item.id}
                item={item}
                onOpen={() => handleOpenResume(item)}
                onRename={() => {
                  setRenameTarget(item);
                  setRenameValue(item.title || "");
                }}
                onDuplicate={() => handleDuplicate(item)}
                onDelete={() => setDeleteTarget(item)}
                isOpening={openingId === item.id}
                isDuplicating={duplicatingId === item.id}
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
                name: deleteTarget?.title || t("builder.studio.untitledResume"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t("builder.resumeLibrary.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={deleteMutation.isPending}
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

      {/* Rename Dialog */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("builder.resumeLibrary.renameTitle")}</DialogTitle>
            <DialogDescription>{t("builder.resumeLibrary.renameDesc")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder={t("builder.studio.untitledResume")}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleConfirmRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameTarget(null)}
              disabled={renameMutation.isPending}
            >
              {t("builder.resumeLibrary.cancel")}
            </Button>
            <Button
              onClick={handleConfirmRename}
              disabled={!renameValue.trim() || renameMutation.isPending}
            >
              {renameMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              {t("builder.resumeLibrary.saveRename")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
