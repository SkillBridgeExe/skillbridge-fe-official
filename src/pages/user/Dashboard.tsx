import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "@/components/layout/Layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BellRing, ChevronRight } from "lucide-react";
import {
  DashboardHero,
  DashboardTabs,
  OverviewTab,
  SkillsTab,
  LearningProgressTab,
  InterviewTab,
  CareerTab,
  type DashboardTabValue,
} from "@/components/dashboard";
import AISidebar from "@/components/dashboard/AISidebar";
import AIChatWidget from "@/components/dashboard/AIChatWidget";
import { MOCK_USER } from "@/lib/mock-data/dashboard";
import { useAuthStore } from "@/store/useAuthStore";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/app";
import { useHasApiSession } from "@/hooks/use-api-session";
import { getMyAvatarUrl, getSafeAvatarUrl, isProtectedAvatarUrl } from "@/services/user-profile.service";

// ─── Scroll-aware section tracking ───────────────
function useSectionObserver(sectionIds: string[]) {
  const [activeSection, setActiveSection] = useState(sectionIds[0]);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const setRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      refs.current[id] = el;
    },
    []
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0;
        let maxId = activeSection;
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            maxId = entry.target.getAttribute("data-section") || maxId;
          }
        });
        if (maxRatio > 0) setActiveSection(maxId);
      },
      { threshold: [0.1, 0.3, 0.5], rootMargin: "-100px 0px -30% 0px" }
    );

    Object.entries(refs.current).forEach(([, el]) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [activeSection]);

  return { activeSection, setRef };
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTabValue>("overview");
  const { activeSection, setRef } = useSectionObserver(["hero", "stats", "tabs"]);
  const { currentUser } = useAuthStore();
  const hasApiSession = useHasApiSession();

  const avatarQuery = useQuery({
    queryKey: QUERY_KEYS.USER_AVATAR,
    queryFn: getMyAvatarUrl,
    enabled: hasApiSession && isProtectedAvatarUrl(currentUser?.avatar),
  });
  
  const dashboardUser = {
    ...MOCK_USER,
    name: currentUser?.name || MOCK_USER.name,
    avatar: avatarQuery.data || getSafeAvatarUrl(currentUser?.avatar) || undefined,
  };

  return (
    <Layout>
      {/* ═══ Dashboard + AI Sidebar — flex row centered ═══ */}
      <div className="max-w-[1700px] mx-auto flex">
        {/* ─── AI Sidebar — sticky, attached to left of dashboard ─── */}
        <div className="hidden xl:block flex-shrink-0 w-[300px] pt-6 pr-4">
          <div className="sticky top-24">
            <AISidebar activeSection={activeSection === "tabs" ? activeTab : activeSection} />
          </div>
        </div>

        {/* ─── Main Dashboard Content ─── */}
        <div className="flex-1 min-w-0 px-4 md:px-6 py-6 space-y-8">
          {/* Banner */}
          <div ref={setRef("hero")} data-section="hero">
            <DashboardHero user={dashboardUser} isAvatarLoading={avatarQuery.isLoading} />
          </div>

          {/* Ecosystem Notification Widget */}
          <Alert className="bg-indigo-50 border-indigo-100 text-indigo-900 shadow-sm flex items-center gap-4 py-3 cursor-pointer hover:bg-indigo-100/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <BellRing className="w-5 h-5 text-indigo-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <AlertTitle className="text-base font-bold text-indigo-900 mb-0.5">Ecosystem Update</AlertTitle>
              <AlertDescription className="text-sm text-indigo-700">
                <strong>Mentor Alex</strong> just reviewed your React assignment and left some feedback. 
              </AlertDescription>
            </div>
            <ChevronRight className="w-4 h-4 text-indigo-400" />
          </Alert>

          {/* Main Content Area */}
          <div ref={setRef("tabs")} data-section="tabs" className="space-y-6">
            <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
            
            <div className="min-h-[500px]">
              {activeTab === "overview" && <OverviewTab />}
              {activeTab === "skills" && <SkillsTab />}
              {activeTab === "learning" && <LearningProgressTab />}
              {activeTab === "interview" && <InterviewTab />}
              {activeTab === "career" && <CareerTab />}
            </div>
          </div>
        </div>

        {/* ─── Right Spacer — visual balance ─── */}
        <div className="hidden xl:block flex-shrink-0 w-[210px]" />
      </div>

      {/* ═══ AI Chat Widget — fixed RIGHT panel ═══ */}
      <AIChatWidget />
    </Layout>
  );
}



