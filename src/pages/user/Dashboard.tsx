import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";
import {
  CareerTab,
  DashboardHero,
  DashboardTabs,
  InterviewTab,
  LearningProgressTab,
  OverviewTab,
  SkillsTab,
  type DashboardTabValue,
} from "@/components/dashboard";
import { resolveDashboardGoal } from "@/components/dashboard/dashboard-view-model";
import { QUERY_KEYS } from "@/constants/app";
import { useHasApiSession } from "@/hooks/use-api-session";
import { useDashboardCoreData } from "@/hooks/use-dashboard-data";
import {
  getMyAvatarUrl,
  getSafeAvatarUrl,
  isProtectedAvatarUrl,
} from "@/services/user-profile.service";
import { useAuthStore } from "@/store/useAuthStore";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTabValue>("overview");
  const { currentUser } = useAuthStore();
  const hasApiSession = useHasApiSession();
  const dashboard = useDashboardCoreData(hasApiSession);
  const avatarQuery = useQuery({
    queryKey: QUERY_KEYS.USER_AVATAR,
    queryFn: getMyAvatarUrl,
    enabled: hasApiSession && isProtectedAvatarUrl(currentUser?.avatar),
  });

  const profile = dashboard.profileQuery.data;
  const latestCv = dashboard.latestCvQuery.data;
  const latestMatch = dashboard.latestMatchQuery.data?.items[0];
  const name = profile?.displayName || currentUser?.name || "there";
  const avatar =
    avatarQuery.data ||
    getSafeAvatarUrl(profile?.avatarUrl || currentUser?.avatar) ||
    undefined;

  return (
    <Layout>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-5 md:px-6 md:py-6">
        <DashboardHero
          name={name}
          avatar={avatar}
          cvScore={latestCv?.review?.overall_score ?? null}
          jobMatchScore={
            latestMatch?.overallScore ?? latestMatch?.matchRatio ?? null
          }
          careerGoal={resolveDashboardGoal(
            profile?.profile,
            latestCv?.targetRole,
          )}
          isAvatarLoading={
            avatarQuery.isLoading || dashboard.profileQuery.isLoading
          }
        />

        <section className="space-y-5">
          <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="min-h-[420px]">
            {activeTab === "overview" && (
              <OverviewTab
                cv={latestCv ?? null}
                isLoading={
                  dashboard.latestCvListQuery.isLoading ||
                  dashboard.latestCvQuery.isLoading
                }
                error={
                  dashboard.latestCvListQuery.error ||
                  dashboard.latestCvQuery.error
                }
              />
            )}
            {activeTab === "skills" && <SkillsTab />}
            {activeTab === "learning" && <LearningProgressTab />}
            {activeTab === "interview" && <InterviewTab />}
            {activeTab === "career" && (
              <CareerTab cvId={dashboard.latestCvId} />
            )}
          </div>
        </section>
      </main>
    </Layout>
  );
}
