// pages/LearningSession.tsx — UPDATED
// Uses roadmap store → works with both demo and AI-generated sessions

import { useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { SessionDetail } from "@/components/learning";
import { useActiveWeekPlans } from "@/components/learning/roadmap-store";
import type { LearningSession as LearningSessionType } from "@/components/learning";

export default function LearningSession() {
  const { id } = useParams<{ id: string }>();
  const weekPlans = useActiveWeekPlans();
  const allSessions = weekPlans.flatMap(w => w.sessions);
  const session = allSessions.find(s => s.id === id);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);

  if (!session) return <Navigate to="/learning" replace />;

  return (
    <Layout hideFooter>
      <div className="flex flex-col overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
        {/* SessionDetail accepts the same LearningSession shape */}
        <SessionDetail session={session as LearningSessionType} />
      </div>
    </Layout>
  );
}
