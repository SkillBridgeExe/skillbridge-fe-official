import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Calendar, GitBranch, LayoutGrid, List, Sparkles } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  GridRoadmapView,
  LearningSidebar,
  ListRoadmapView,
  OverviewView,
  SkillRoadmapMapView,
} from "@/components/learning";
import { AIChatbot } from "@/components/learning/AIChatbot";
import { useRoadmapStore } from "@/components/learning/roadmap-store";
import { LearningRoadmapWizard } from "@/components/learning/LearningRoadmapWizard";
import { useActiveLearningRoadmapBootstrap } from "@/components/learning/use-active-learning-roadmap";
import {
  archiveActiveLearningRoadmap,
} from "@/services/learning-roadmaps-v2.service";

type ViewMode = "map" | "overview" | "grid" | "list";

const VIEW_TABS: { value: ViewMode; labelKey: string; icon: React.ElementType }[] = [
  { value: "map", labelKey: "learning.tabs.roadmap", icon: GitBranch },
  { value: "overview", labelKey: "learning.tabs.today", icon: Calendar },
  { value: "grid", labelKey: "learning.tabs.overview", icon: LayoutGrid },
  { value: "list", labelKey: "learning.tabs.list", icon: List },
];

export default function Learning() {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<ViewMode>("map");
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isArchivingRoadmap, setIsArchivingRoadmap] = useState(false);
  const { activeRoadmap, clearRoadmap, setActiveRoadmap } = useRoadmapStore();
  const roadmapBootstrap = useActiveLearningRoadmapBootstrap();
  const isLoadingRoadmap = roadmapBootstrap.status === "loading";
  const hasRoadmap = Boolean(activeRoadmap);
  const moduleCount = activeRoadmap?.modules.length ?? 0;
  const totalHours = activeRoadmap
    ? Math.round(
        (activeRoadmap.modules.reduce((sum, module) => sum + module.estimated_minutes, 0) / 60) *
          10,
      ) / 10
    : 0;

  const handleClearRoadmap = async () => {
    if (!activeRoadmap) {
      clearRoadmap();
      return;
    }

    setIsArchivingRoadmap(true);
    try {
      await archiveActiveLearningRoadmap();
      clearRoadmap();
      toast({ title: t("learning.page.archiveSuccess") });
    } catch (cause) {
      toast({
        title: t("learning.page.archiveError"),
        description:
          cause instanceof Error ? cause.message : t("learning.page.archiveError"),
        variant: "destructive",
      });
    } finally {
      setIsArchivingRoadmap(false);
    }
  };

  return (
    <Layout hideFooter>
      <div className="flex justify-center px-4 md:px-6">
        <div className="flex w-full max-w-[1200px] flex-col gap-6 py-6 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-5">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold leading-tight text-slate-900">
                    {hasRoadmap ? t("learning.page.roadmapTitle") : t("learning.page.title")}
                  </h1>
                  {hasRoadmap && (
                    <Badge className="flex items-center gap-1 border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
                      <Sparkles className="h-3 w-3" />{" "}
                      {activeRoadmap?.content_source === "AI_ENHANCED"
                        ? "Nội dung AI tối ưu"
                        : "Nội dung tiêu chuẩn"}
                    </Badge>
                  )}
                  {activeRoadmap ? (
                    <Badge variant="outline" className="text-xs">
                      {activeRoadmap.learning_track === "FAST_TRACK"
                        ? "Cấp tốc"
                        : "Nền tảng"}{" "}
                      · {activeRoadmap.coverage_percentage}%
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-slate-500">
                  {hasRoadmap
                    ? t("learning.page.meta", {
                        count: moduleCount,
                        hours: totalHours,
                      })
                    : t("learning.page.emptyMeta")}
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 min-[420px]:flex-row sm:w-auto sm:flex-shrink-0 sm:items-center">
                {activeRoadmap && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearRoadmap}
                    disabled={isArchivingRoadmap}
                    className="w-full rounded-full text-xs text-slate-400 hover:text-slate-700 min-[420px]:w-auto"
                  >
                    {t("learning.page.clearRoadmap")}
                  </Button>
                )}
                <Button
                  onClick={() => setIsWizardOpen(true)}
                  className="w-full gap-2 rounded-full text-sm font-semibold shadow-sm min-[420px]:w-auto"
                  variant={hasRoadmap ? "outline" : "default"}
                >
                  <Sparkles className="h-4 w-4" />
                  {hasRoadmap ? t("learning.page.regenerate") : t("learning.page.generateRoadmap")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveView("list")}
                  className="w-full rounded-full border-slate-200 text-sm font-semibold text-slate-700 min-[420px]:w-auto"
                >
                  <BookOpen className="mr-2 h-4 w-4" /> {t("learning.page.viewSyllabus")}
                </Button>
              </div>
            </header>

            {hasRoadmap && (
              <div className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 sm:mx-0 sm:w-fit">
                {VIEW_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeView === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveView(tab.value)}
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all sm:px-4",
                        isActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {t(tab.labelKey)}
                    </button>
                  );
                })}
              </div>
            )}

            {isLoadingRoadmap && !hasRoadmap ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                {t("learning.page.loading", { defaultValue: "Loading..." })}
              </div>
            ) : hasRoadmap ? (
              <div className="animate-in fade-in duration-300">
                {activeView === "map" && <SkillRoadmapMapView />}
                {activeView === "overview" && <OverviewView />}
                {activeView === "grid" && <GridRoadmapView />}
                {activeView === "list" && <ListRoadmapView />}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">{t("learning.page.emptyTitle")}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                  {t("learning.page.emptyBody")}
                </p>
                <Button onClick={() => setIsWizardOpen(true)} className="mt-5 rounded-full font-semibold">
                  {t("learning.page.generateRoadmap")}
                </Button>
              </div>
            )}
          </div>

          <div className="w-full flex-shrink-0 lg:w-[280px]">
            <div className="mt-6 lg:sticky lg:top-24 lg:mt-0">
              <LearningSidebar />
            </div>
          </div>
        </div>
      </div>

      <AIChatbot />
      {isWizardOpen ? (
        <LearningRoadmapWizard
          onClose={() => setIsWizardOpen(false)}
          onGenerated={(roadmap) => {
            setActiveRoadmap(roadmap);
            setIsWizardOpen(false);
          }}
        />
      ) : null}
    </Layout>
  );
}
