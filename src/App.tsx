import "./global.css";
import "@/i18n";

import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import AuthGuard from "@/components/layout/AuthGuard";
import AuthBootstrap from "@/components/auth/AuthBootstrap";
import PageLoader from "@/components/common/PageLoader";
import { MascotOverlay } from "@/components/mascot/MascotOverlay";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { QuotaUpgradeListener } from "@/components/billing/QuotaUpgradeListener";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/query-client";
import * as Pages from "@/routes/lazy-pages";
import ComingSoon from "@/components/common/ComingSoon";
import { FEATURES } from "@/config/features";

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
        <QuotaUpgradeListener />
        <MascotOverlay />
        <AuthBootstrap />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Pages.Index />} />
              <Route path="/register" element={<Pages.Register />} />
              <Route path="/about" element={<Pages.About />} />
              <Route path="/success" element={<Pages.SuccessStats />} />
              <Route path="/testimonials" element={<Pages.Testimonials />} />
              <Route path="/privacy" element={<Pages.PrivacyPolicy />} />
              <Route path="/help" element={<Pages.HelpCenter />} />
              <Route path="/contact" element={<Pages.Contact />} />
              <Route path="/verify-email" element={<Pages.VerifyEmail />} />

              <Route path="/dashboard" element={<Pages.Dashboard />} />
              <Route path="/profile" element={<AuthGuard requiredRole="user"><Pages.UserProfile /></AuthGuard>} />
              <Route path="/diagnosis" element={<Pages.Diagnosis />} />
              <Route path="/learning" element={<Pages.LearningComingSoon />} />
              {/* /practice was a fake AI-interview duplicate; the real (soon) flow is /interview. */}
              <Route path="/practice" element={<Navigate to="/interview" replace />} />
              <Route path="/learning/session/:id" element={<Pages.LearningSession />} />
              <Route
                path="/interview"
                element={
                  <AuthGuard requireAuth>
                    {FEATURES.interview ? <Pages.Interview /> : <ComingSoon feature="interview" />}
                  </AuthGuard>
                }
              />
              <Route path="/ecosystem" element={<Pages.Ecosystem />} />
              <Route path="/ecosystem/mentor/:mentorSlug" element={<Pages.MentorProfile />} />
              <Route path="/payment" element={<Navigate to="/pricing" replace />} />
              <Route path="/pricing" element={<Pages.Pricing />} />
              <Route path="/billing/me" element={<AuthGuard requiredRole="user"><Pages.BillingMe /></AuthGuard>} />
              <Route path="/billing/checkout" element={<AuthGuard requireAuth><Pages.BillingCheckoutReturn /></AuthGuard>} />
              <Route path="/billing/checkout/:orderCode" element={<AuthGuard requireAuth><Pages.BillingCheckoutStatus /></AuthGuard>} />
              <Route path="/community" element={<Pages.Community />} />
              <Route path="/jobs" element={<Pages.Jobs />} />
              <Route path="/roadmap-generator" element={FEATURES.roadmap ? <Pages.RoadmapGenerator /> : <ComingSoon feature="roadmap" />} />
              <Route path="/cv-builder" element={<Navigate to="/diagnosis?mode=builder" replace />} />
              <Route path="/mascot" element={<Pages.MascotShowcase />} />

              <Route path="/business" element={<AuthGuard requiredRole="business"><Pages.BusinessDashboard /></AuthGuard>}/>
              <Route path="/business/profile" element={<AuthGuard requiredRole="business"><Pages.BusinessProfile /></AuthGuard>}/>
              <Route path="/business/jobs" element={<AuthGuard requiredRole="business"><Pages.BusinessJobs /></AuthGuard>}/>
              <Route path="/business/top-candidates" element={<AuthGuard requiredRole="business"><Pages.TopCandidates /></AuthGuard>}/>
              <Route path="/business/applicants" element={<AuthGuard requiredRole="business"><Pages.BusinessApplicants /></AuthGuard>}/>

              <Route path="/mentor-dashboard" element={<AuthGuard requiredRole="mentor"><Pages.MentorDashboardShell /></AuthGuard>}>
                <Route index element={<Pages.MentorOverview />} />
                <Route path="profile" element={<Pages.MentorProfileSetup />} />
              </Route>
              <Route path="/mentor" element={<Navigate to="/mentor-dashboard" replace />} />

              <Route path="/admin" element={<AuthGuard requiredRole="admin"><Pages.AdminDashboard /></AuthGuard>}>
                <Route index element={<Pages.AdminOverview />} />
                <Route path="insights" element={<Pages.AdminInsights />} />
                <Route path="users" element={<Pages.AdminUserManagement />} />
                <Route path="users/:id" element={<Pages.AdminUserProfile />} />
                <Route path="mentors" element={<Pages.AdminMentors />} />
                <Route path="billing/plans" element={<Pages.AdminBillingPlans />} />
                <Route path="billing/orders" element={<Pages.AdminBillingOrders />} />
                <Route path="billing/subscriptions" element={<Pages.AdminBillingSubscriptions />} />
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
