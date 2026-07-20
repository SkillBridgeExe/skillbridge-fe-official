import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, GitBranch, Info, List, Sparkles } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LearningSidebar,
  ListRoadmapView,
  OverviewView,
  SkillRoadmapMapView,
} from "@/components/learning";
import { AIChatbot } from "@/components/learning/AIChatbot";
import { useRoadmapStore } from "@/components/learning/roadmap-store";
import {
  clearActiveLearningRoadmap,
  getActiveLearningRoadmap,
} from "@/services/learning-roadmap.service";

type ViewMode = "map" | "overview" | "list";

const VIEW_TABS: { value: ViewMode; labelKey: string; icon: React.ElementType }[] = [
  { value: "map", labelKey: "learning.tabs.roadmap", icon: GitBranch },
  { value: "overview", labelKey: "learning.tabs.today", icon: Calendar },
  { value: "list", labelKey: "learning.tabs.list", icon: List },
];

export default function Learning() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewMode>("map");
  const {
    composedRoadmap,
    isAIGenerated,
    clearRoadmap,
    clearTranslatedDisplayFromRoadmap,
    setPersistedRoadmap,
    setPersistedRoadmapId,
  } = useRoadmapStore();
  const hasRoadmap = Boolean(composedRoadmap);
  const roadmapSummary = composedRoadmap
    ? t("learning.page.aiSummary", { count: composedRoadmap.steps.length })
    : "";

  useEffect(() => {
    let cancelled = false;
    getActiveLearningRoadmap()
      .then((roadmap) => {
        if (cancelled || !roadmap) return;
        if (!composedRoadmap) {
          setPersistedRoadmap(roadmap.id, roadmap.composedRoadmap);
          return;
        }
        setPersistedRoadmapId(roadmap.id);
        clearTranslatedDisplayFromRoadmap(roadmap.composedRoadmap);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [clearTranslatedDisplayFromRoadmap, composedRoadmap, setPersistedRoadmap, setPersistedRoadmapId]);

  const handleClearRoadmap = async () => {
    try {
      await clearActiveLearningRoadmap();
    } finally {
      clearRoadmap();
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
                      <Sparkles className="h-3 w-3" /> {t("learning.page.aiGenerated")}
                    </Badge>
                  )}
                  <button className="h-5 w-5 text-slate-400 hover:text-primary" aria-label={t("learning.page.info")}>
                    <Info className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-slate-500">
                  {composedRoadmap
                    ? t("learning.page.meta", {
                        count: composedRoadmap.steps.length,
                      })
                    : t("learning.page.emptyMeta")}
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 min-[420px]:flex-row sm:w-auto sm:flex-shrink-0 sm:items-center">
                {isAIGenerated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearRoadmap}
                    className="w-full rounded-full text-xs text-slate-400 hover:text-slate-700 min-[420px]:w-auto"
                  >
                    {t("learning.page.clearRoadmap")}
                  </Button>
                )}
                <Button
                  onClick={() => navigate("/diagnosis")}
                  className="w-full gap-2 rounded-full text-sm font-semibold shadow-sm min-[420px]:w-auto"
                  variant={hasRoadmap ? "outline" : "default"}
                >
                  <Sparkles className="h-4 w-4" />
                  {hasRoadmap ? t("learning.page.regenerate") : t("learning.page.generateRoadmap")}
                </Button>
              </div>
            </header>

            {composedRoadmap && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
                <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                <p className="text-sm leading-relaxed text-amber-800">
                  <span className="font-semibold">{t("learning.page.aiTip")} </span>
                  {roadmapSummary}
                </p>
              </div>
            )}

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

            {hasRoadmap ? (
              <div className="animate-in fade-in duration-300">
                {activeView === "map" && <SkillRoadmapMapView />}
                {activeView === "overview" && <OverviewView />}
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
                <Button onClick={() => navigate("/diagnosis")} className="mt-5 rounded-full font-semibold">
                  {t("learning.page.goDiagnosis")}
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
    </Layout>
  );
}
