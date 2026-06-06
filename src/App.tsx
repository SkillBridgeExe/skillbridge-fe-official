import "./global.css";
import "@/i18n";

import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import AuthGuard from "@/components/layout/AuthGuard";
import PageLoader from "@/components/common/PageLoader";
import { MascotOverlay } from "@/components/mascot/MascotOverlay";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/query-client";
import * as Pages from "@/routes/lazy-pages";

function AdminFallback() {
  return (
    <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-[50vh]">
      <h2 className="text-2xl font-bold text-foreground mb-2">Module Coming Soon</h2>
      <p>This module is currently under development.</p>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="skillbridge-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <MascotOverlay />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Pages.Index />} />
              <Route path="/login" element={<Pages.Login />} />
              <Route path="/register" element={<Pages.Register />} />
              <Route path="/about" element={<Pages.About />} />
              <Route path="/success" element={<Pages.SuccessStats />} />
              <Route path="/testimonials" element={<Pages.Testimonials />} />
              <Route path="/privacy" element={<Pages.PrivacyPolicy />} />
              <Route path="/help" element={<Pages.HelpCenter />} />
              <Route path="/contact" element={<Pages.Contact />} />
              <Route path="/verify-email" element={<Pages.VerifyEmail />} />

              <Route path="/dashboard" element={<Pages.Dashboard />} />
              <Route path="/diagnosis" element={<Pages.Diagnosis />} />
              <Route path="/learning" element={<Pages.Learning />} />
              <Route path="/practice" element={<Pages.Practice />} />
              <Route path="/learning/session/:id" element={<Pages.LearningSession />} />
              <Route path="/interview" element={<Pages.Interview />} />
              <Route path="/ecosystem" element={<Pages.Ecosystem />} />
              <Route path="/ecosystem/mentor/:mentorSlug" element={<Pages.MentorProfile />} />
              <Route path="/payment" element={<Pages.Payment />} />
              <Route path="/mentor-connect" element={<Pages.MentorConnect />} />
              <Route path="/community" element={<Pages.Community />} />
              <Route path="/jobs" element={<Pages.Jobs />} />
              <Route path="/roadmap-generator" element={<Pages.RoadmapGenerator />} />
              <Route path="/cv-builder" element={<Navigate to="/diagnosis?mode=builder" replace />} />
              <Route path="/mascot" element={<Pages.MascotShowcase />} />

              <Route
                path="/business"
                element={<AuthGuard requiredRole="business"><Pages.BusinessDashboard /></AuthGuard>}
              />
              <Route
                path="/business/profile"
                element={<AuthGuard requiredRole="business"><Pages.BusinessProfile /></AuthGuard>}
              />
              <Route
                path="/business/jobs"
                element={<AuthGuard requiredRole="business"><Pages.BusinessJobs /></AuthGuard>}
              />
              <Route
                path="/business/top-candidates"
                element={<AuthGuard requiredRole="business"><Pages.TopCandidates /></AuthGuard>}
              />
              <Route
                path="/business/applicants"
                element={<AuthGuard requiredRole="business"><Pages.BusinessApplicants /></AuthGuard>}
              />

              <Route path="/mentor-room/:roomId" element={<Pages.MentorRoom />} />
              <Route path="/mentor-dashboard" element={<Pages.MentorDashboardShell />}>
                <Route index element={<Pages.MentorOverview />} />
                <Route path="overview" element={<Pages.MentorOverview />} />
                <Route path="availability" element={<Pages.MentorAvailability />} />
                <Route path="profile" element={<Pages.MentorProfileSetup />} />
                <Route path="requests" element={<Pages.MentorRequests />} />
                <Route path="workspace" element={<Pages.MentorWorkspace />} />
                <Route path="history" element={<Pages.MentorHistory />} />
                <Route path="reviews" element={<Pages.MentorReviews />} />
                <Route path="wallet" element={<Pages.MentorWallet />} />
              </Route>
              <Route
                path="/mentor"
                element={<AuthGuard requiredRole="mentor"><Pages.MentorLanding /></AuthGuard>}
              />

              <Route
                path="/admin"
                element={<AuthGuard requiredRole="admin"><Pages.AdminDashboard /></AuthGuard>}
              >
                <Route index element={<Pages.AdminOverview />} />
                <Route path="insights" element={<Pages.AdminInsights />} />
                <Route path="users" element={<Pages.AdminUserManagement />} />
                <Route path="users/:id" element={<Pages.AdminUserProfile />} />
                <Route path="operations" element={<Pages.AdminCoreOperations />} />
                <Route path="commerce" element={<Pages.AdminCommerceFinance />} />
                <Route path="community" element={<Pages.AdminCommunityManagement />} />
                <Route path="system" element={<Pages.AdminSystemAdministration />} />
                <Route path="settings" element={<Pages.AdminSettings />} />
                <Route path="*" element={<AdminFallback />} />
              </Route>

              <Route path="*" element={<Pages.NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

const w = window as unknown as { _reactRoot?: ReturnType<typeof createRoot> };
const rootElement = document.getElementById("root")!;
const root = w._reactRoot || createRoot(rootElement);
if (!w._reactRoot) {
  w._reactRoot = root;
}
root.render(<App />);
