// pages/LearningSession.tsx — UPDATED
// Uses roadmap store → works with both demo and AI-generated sessions

import { useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { SessionDetail } from "@/components/learning";
import { useActiveWeekPlans } from "@/components/learning/roadmap-store";
import { useActiveLearningRoadmapBootstrap } from "@/components/learning/use-active-learning-roadmap";
import { useSidebarStore } from "@/store/useSidebarStore";
import type { LearningSession as LearningSessionType } from "@/components/learning";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export default function LearningSession() {
  const { t } = useTranslation("common");
  const { id } = useParams<{ id: string }>();
  const weekPlans = useActiveWeekPlans();
  const allSessions = weekPlans.flatMap(w => w.sessions);
  const session = allSessions.find(s => s.id === id);
  const bootstrap = useActiveLearningRoadmapBootstrap();
  const setCollapsed = useSidebarStore((state) => state.setCollapsed);
  const setForceCollapsed = useSidebarStore((state) => state.setForceCollapsed);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);

  useEffect(() => {
    const previousCollapsed = useSidebarStore.getState().collapsed;
    setForceCollapsed(true);

    return () => {
      setForceCollapsed(false);
      setCollapsed(previousCollapsed);
    };
  }, [setCollapsed, setForceCollapsed]);

  if (bootstrap.status === "loading" && !session) {
    return (
      <Layout hideFooter>
        <div role="status" className="grid min-h-[50vh] place-items-center text-sm text-slate-500">
          {t("learning.session.loadingRoadmap")}
        </div>
      </Layout>
    );
  }
  if (bootstrap.status === "error" && !session) {
    return (
      <Layout hideFooter>
        <div className="grid min-h-[50vh] place-items-center px-4">
          <div role="alert" className="space-y-3 text-center">
            <p className="text-sm text-red-600">
              {bootstrap.error?.message || t("learning.page.loadError")}
            </p>
            <Button type="button" variant="outline" onClick={bootstrap.retry}>
              {t("learning.session.retry")}
            </Button>
          </div>
        </div>
      </Layout>
    );
  }
  if (!session) return <Navigate to="/learning" replace />;

  return (
    <Layout hideFooter>
      <div className="flex flex-col overflow-hidden" style={{ height: "calc(100dvh - 64px)" }}>
        {/* SessionDetail accepts the same LearningSession shape */}
        <SessionDetail session={session as LearningSessionType} />
      </div>
    </Layout>
  );
}
