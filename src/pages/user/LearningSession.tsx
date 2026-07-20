// pages/LearningSession.tsx — UPDATED
// Uses roadmap store → works with both demo and AI-generated sessions

import { useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { SessionDetail } from "@/components/learning";
import { useActiveWeekPlans } from "@/components/learning/roadmap-store";
import { useSidebarStore } from "@/store/useSidebarStore";
import type { LearningSession as LearningSessionType } from "@/components/learning";

export default function LearningSession() {
  const { id } = useParams<{ id: string }>();
  const weekPlans = useActiveWeekPlans();
  const allSessions = weekPlans.flatMap(w => w.sessions);
  const session = allSessions.find(s => s.id === id);
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
