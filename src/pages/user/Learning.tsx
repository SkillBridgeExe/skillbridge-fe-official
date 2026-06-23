import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, Calendar, Info, LayoutGrid, List, Sparkles } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  GridRoadmapView,
  LearningSidebar,
  ListRoadmapView,
  OverviewView,
} from "@/components/learning";
import { AIChatbot } from "@/components/learning/AIChatbot";
import { useRoadmapStore } from "@/components/learning/roadmap-store";

type ViewMode = "overview" | "grid" | "list";

const VIEW_TABS: { value: ViewMode; labelKey: string; icon: React.ElementType }[] = [
  { value: "overview", labelKey: "learning.tabs.today", icon: Calendar },
  { value: "grid", labelKey: "learning.tabs.overview", icon: LayoutGrid },
  { value: "list", labelKey: "learning.tabs.list", icon: List },
];

export default function Learning() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewMode>("overview");
  const { composedRoadmap, isAIGenerated, clearRoadmap } = useRoadmapStore();
  const hasRoadmap = Boolean(composedRoadmap);

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
                        hours: composedRoadmap.budget_hours,
                      })
                    : t("learning.page.emptyMeta")}
                </p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                {isAIGenerated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRoadmap}
                    className="rounded-full text-xs text-slate-400 hover:text-slate-700"
                  >
                    {t("learning.page.clearRoadmap")}
                  </Button>
                )}
                <Button
                  onClick={() => navigate("/diagnosis")}
                  className="gap-2 rounded-full text-sm font-semibold shadow-sm"
                  variant={hasRoadmap ? "outline" : "default"}
                >
                  <Sparkles className="h-4 w-4" />
                  {hasRoadmap ? t("learning.page.regenerate") : t("learning.page.generateRoadmap")}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-slate-200 text-sm font-semibold text-slate-700"
                >
                  <BookOpen className="mr-2 h-4 w-4" /> {t("learning.page.viewSyllabus")}
                </Button>
              </div>
            </header>

            {composedRoadmap?.ai_summary && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
                <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                <p className="text-sm leading-relaxed text-amber-800">
                  <span className="font-semibold">{t("learning.page.aiTip")} </span>
                  {composedRoadmap.ai_summary}
                </p>
              </div>
            )}

            {composedRoadmap?.not_feasible_items.length ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold text-slate-900">{t("learning.page.notFeasible")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {composedRoadmap.not_feasible_items.map((item) => (
                    <Badge
                      key={item.skill_canonical}
                      variant="outline"
                      className="border-amber-200 bg-amber-50 text-amber-700"
                    >
                      {item.display_name}
                      {item.estimated_hours
                        ? ` - ${t("learning.common.hours", { count: item.estimated_hours })}`
                        : item.reason
                        ? ` - ${item.reason}`
                        : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {hasRoadmap && (
              <div className="flex w-fit items-center gap-1 rounded-xl bg-slate-100 p-1">
                {VIEW_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeView === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveView(tab.value)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
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
