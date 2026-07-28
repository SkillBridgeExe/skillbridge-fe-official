import "./global.css";
import "@/i18n";
import "@/lib/version"; // W28: log version stamp to console on boot

import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from "react-router-dom";
import posthog from "posthog-js";
import { PostHogErrorBoundary, PostHogProvider } from "@posthog/react";
import { POSTHOG_HOST, POSTHOG_PROJECT_TOKEN } from "@/lib/runtime-config";

if (POSTHOG_PROJECT_TOKEN) {
  posthog.init(POSTHOG_PROJECT_TOKEN, {
    api_host: POSTHOG_HOST || "https://us.i.posthog.com",
    defaults: "2026-01-30",
    autocapture: true,
    capture_pageview: "history_change",
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
      compress_events: true,
    },
  });
}
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import AuthGuard from "@/components/layout/AuthGuard";
import LearningAccessBoundary from "@/components/learning/LearningAccessBoundary";
import AuthBootstrap from "@/components/auth/AuthBootstrap";
import PageLoader from "@/components/common/PageLoader";
import { MascotOverlay } from "@/components/mascot/MascotOverlay";
import { CompanionShell } from "@/components/companion/CompanionShell";
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

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
              <Route path="/" element={<Pages.Index />} />
              <Route path="/register" element={<Navigate to="/?auth=register" replace />} />
              <Route path="/about" element={<Pages.About />} />
              <Route path="/success" element={<Pages.SuccessStats />} />
              <Route path="/testimonials" element={<Pages.Testimonials />} />
              <Route path="/privacy" element={<Pages.PrivacyPolicy />} />
              <Route path="/help" element={<Pages.HelpCenter />} />
              <Route path="/contact" element={<Pages.Contact />} />
              <Route path="/verify-email" element={<Pages.VerifyEmail />} />
              <Route path="/forgot-password" element={<Pages.ForgotPassword />} />
              <Route path="/reset-password" element={<Pages.ResetPassword />} />
              <Route path="/business/verify-email" element={<Pages.BusinessVerifyEmail />} />

              <Route path="/dashboard" element={<Pages.Dashboard />} />
              <Route path="/profile" element={<AuthGuard requiredRole="user"><Pages.UserProfile /></AuthGuard>} />
              <Route path="/diagnosis" element={<Pages.Diagnosis />} />
              <Route path="/cv-studio" element={<AuthGuard requiredRole="user"><Pages.ResumeLibrary /></AuthGuard>} />
              <Route path="/learning" element={<LearningAccessBoundary><Pages.Learning /></LearningAccessBoundary>} />
              {/* /practice was a fake AI-interview duplicate; the real (soon) flow is /interview. */}
              <Route path="/practice" element={<Navigate to="/interview" replace />} />
              <Route path="/learning/session/:id" element={<LearningAccessBoundary><Pages.LearningSession /></LearningAccessBoundary>} />
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
              <Route path="/jobs/:slug" element={<Pages.JobDetail />} />
              <Route path="/roadmap-generator" element={<Navigate to="/diagnosis" replace />} />
              <Route path="/cv-builder" element={<Navigate to="/diagnosis?mode=builder" replace />} />
              <Route path="/mascot" element={<Pages.MascotShowcase />} />
              {/* Deploy-verification harness (W118): renders the static sample CV
                  through every template/format — read-only, no API, no user data.
                  Deliberately available in production so post-deploy smoke can
                  prove the PDF worker + renderer on the exact deployed bundle. */}
              <Route path="/dev/resume-smoke" element={<Pages.ResumeSmoke />} />

              <Route path="/business" element={<AuthGuard requiredRole="business"><Pages.BusinessDashboard /></AuthGuard>}/>
              <Route path="/business/profile" element={<AuthGuard requiredRole="business"><Pages.BusinessProfile /></AuthGuard>}/>
              <Route path="/business/jobs" element={<AuthGuard requiredRole="business"><Pages.BusinessJobs /></AuthGuard>}/>
              <Route path="/business/jobs/:jobId/edit" element={<AuthGuard requiredRole="business"><Pages.BusinessJobEdit /></AuthGuard>}/>
              <Route path="/business/top-candidates" element={<AuthGuard requiredRole="business"><Pages.TopCandidates /></AuthGuard>}/>
              <Route path="/business/applicants" element={<AuthGuard requiredRole="business"><Pages.BusinessApplicants /></AuthGuard>}/>

              <Route path="/mentor-dashboard" element={<AuthGuard requiredRole="mentor"><Pages.MentorDashboardShell /></AuthGuard>}>
                <Route index element={<Pages.MentorOverview />} />
                <Route path="profile" element={<Pages.MentorProfileSetup />} />
                <Route path="availability" element={<Pages.MentorAvailability />} />
                <Route path="requests" element={<Pages.MentorRequests />} />
              </Route>
              <Route path="/mentor" element={<Navigate to="/mentor-dashboard" replace />} />
              <Route path="/billing/mentor" element={<AuthGuard requireAuth><Pages.MentorBilling /></AuthGuard>} />

              <Route path="/admin" element={<AuthGuard requiredRole="admin"><Pages.AdminDashboard /></AuthGuard>}>
                <Route index element={<Pages.AdminOverview />} />
                <Route path="insights" element={<Pages.AdminInsights />} />
                <Route path="users" element={<Pages.AdminUserManagement />} />
                <Route path="users/:id" element={<Pages.AdminUserProfile />} />
                <Route path="mentors" element={<Pages.AdminMentors />} />
                <Route path="billing/plans" element={<Pages.AdminBillingPlans />} />
                <Route path="billing/orders" element={<Pages.AdminBillingOrders />} />
                <Route path="billing/subscriptions" element={<Pages.AdminBillingSubscriptions />} />
                <Route path="billing/vouchers" element={<Pages.AdminBillingVouchers />} />
                <Route path="billing/mentor-bookings" element={<Pages.AdminBillingMentorBookings />} />
                <Route path="reports" element={<Pages.AdminJobReports />} />
                <Route path="business-profiles" element={<Pages.AdminBusinessProfiles />} />
                <Route path="*" element={<AdminFallback />} />
              </Route>

      <Route path="*" element={<Pages.NotFound />} />
    </>,
  ),
);

const App = () => (
  <PostHogProvider client={posthog}>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="skillbridge-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <QuotaUpgradeListener />
        <MascotOverlay />
        <CompanionShell />
        <AuthBootstrap />
        <PostHogErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <RouterProvider router={router} />
          </Suspense>
        </PostHogErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </PostHogProvider>
);

const w = window as unknown as { _reactRoot?: ReturnType<typeof createRoot> };
const rootElement = document.getElementById("root")!;
const root = w._reactRoot || createRoot(rootElement);
if (!w._reactRoot) {
  w._reactRoot = root;
}
root.render(<App />);
