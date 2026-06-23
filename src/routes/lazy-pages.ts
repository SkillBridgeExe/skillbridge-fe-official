import { lazy } from "react";

export const Index = lazy(() => import("@/pages/public/Index"));
export const About = lazy(() => import("@/pages/public/About"));
export const Ecosystem = lazy(() => import("@/pages/public/Ecosystem"));
export const PrivacyPolicy = lazy(() => import("@/pages/public/PrivacyPolicy"));
export const HelpCenter = lazy(() => import("@/pages/public/HelpCenter"));
export const Contact = lazy(() => import("@/pages/public/Contact"));
export const Community = lazy(() => import("@/pages/public/Community"));
export const NotFound = lazy(() => import("@/pages/public/NotFound"));

export const Register = lazy(() => import("@/pages/auth/Register"));
export const VerifyEmail = lazy(() => import("@/pages/auth/VerifyEmail"));

export const Dashboard = lazy(() => import("@/pages/user/Dashboard"));
export const UserProfile = lazy(() => import("@/pages/user/Profile"));
export const Diagnosis = lazy(() => import("@/pages/user/Diagnosis"));
export const Learning = lazy(() => import("@/pages/user/Learning"));
export const LearningComingSoon = lazy(() => import("@/pages/user/LearningComingSoon"));
export const Practice = lazy(() => import("@/pages/user/Practice"));
export const LearningSession = lazy(() => import("@/pages/user/LearningSession"));
export const Interview = lazy(() => import("@/pages/user/Interview"));
export const Pricing = lazy(() => import("@/pages/user/Pricing"));
export const BillingCheckoutReturn = lazy(() => import("@/pages/user/BillingCheckoutReturn"));
export const BillingCheckoutStatus = lazy(() => import("@/pages/user/BillingCheckoutStatus"));
export const BillingMe = lazy(() => import("@/pages/user/BillingMe"));
export const Jobs = lazy(() => import("@/pages/user/Jobs"));
export const SuccessStats = lazy(() => import("@/pages/user/SuccessStats"));
export const Testimonials = lazy(() => import("@/pages/user/Testimonials"));

export const BusinessDashboard = lazy(() => import("@/pages/business/BusinessDashboard"));
export const BusinessProfile = lazy(() => import("@/pages/business/BusinessProfile"));
export const BusinessJobs = lazy(() => import("@/pages/business/BusinessJobs"));
export const TopCandidates = lazy(() => import("@/pages/business/TopCandidates"));
export const BusinessApplicants = lazy(() => import("@/pages/business/BusinessApplicants"));

export const MentorProfile = lazy(() => import("@/pages/mentor/MentorProfile"));
export const MentorDashboardShell = lazy(() => import("@/pages/mentor/MentorDashboardShell"));
export const MentorOverview = lazy(() => import("@/pages/mentor/MentorOverview"));
export const MentorProfileSetup = lazy(() => import("@/pages/mentor/MentorProfileSetup"));
export const MentorAvailability = lazy(() => import("@/pages/mentor/MentorAvailability"));
export const MentorRequests = lazy(() => import("@/pages/mentor/MentorRequests"));
export const MentorBilling = lazy(() => import("@/pages/user/MentorBilling"));

export const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
export const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
export const AdminInsights = lazy(() => import("@/pages/admin/AdminInsights"));
export const AdminUserManagement = lazy(() => import("@/pages/admin/AdminUserManagement"));
export const AdminUserProfile = lazy(() => import("@/pages/admin/AdminUserProfile"));
export const AdminBillingPlans = lazy(() => import("@/pages/admin/AdminBillingPlans"));
export const AdminBillingOrders = lazy(() => import("@/pages/admin/AdminBillingOrders"));
export const AdminBillingSubscriptions = lazy(() => import("@/pages/admin/AdminBillingSubscriptions"));
export const AdminMentors = lazy(() => import("@/pages/admin/AdminMentors"));
export const AdminBillingMentorBookings = lazy(() => import("@/pages/admin/AdminBillingMentorBookings"));

// Dev-only mascot animation showcase (visit /mascot). Safe to remove later.
export const MascotShowcase = lazy(() => import("@/pages/dev/MascotShowcase"));
