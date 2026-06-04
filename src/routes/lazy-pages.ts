import { lazy } from "react";

export const Index = lazy(() => import("@/pages/public/Index"));
export const About = lazy(() => import("@/pages/public/About"));
export const Ecosystem = lazy(() => import("@/pages/public/Ecosystem"));
export const PrivacyPolicy = lazy(() => import("@/pages/public/PrivacyPolicy"));
export const HelpCenter = lazy(() => import("@/pages/public/HelpCenter"));
export const Contact = lazy(() => import("@/pages/public/Contact"));
export const Community = lazy(() => import("@/pages/public/Community"));
export const NotFound = lazy(() => import("@/pages/public/NotFound"));

export const Login = lazy(() => import("@/pages/auth/Login"));
export const Register = lazy(() => import("@/pages/auth/Register"));
export const VerifyEmail = lazy(() => import("@/pages/auth/VerifyEmail"));

export const Dashboard = lazy(() => import("@/pages/user/Dashboard"));
export const Diagnosis = lazy(() => import("@/pages/user/Diagnosis"));
export const Learning = lazy(() => import("@/pages/user/Learning"));
export const Practice = lazy(() => import("@/pages/user/Practice"));
export const LearningSession = lazy(() => import("@/pages/user/LearningSession"));
export const Interview = lazy(() => import("@/pages/user/Interview"));
export const Payment = lazy(() => import("@/pages/user/Payment"));
export const MentorConnect = lazy(() => import("@/pages/user/MentorConnect"));
export const Jobs = lazy(() => import("@/pages/user/Jobs"));
export const RoadmapGenerator = lazy(() => import("@/pages/user/RoadmapGenerator"));
export const CvBuilder = lazy(() => import("@/pages/user/CvBuilder"));
export const SuccessStats = lazy(() => import("@/pages/user/SuccessStats"));
export const Testimonials = lazy(() => import("@/pages/user/Testimonials"));
export const MentorLanding = lazy(() => import("@/pages/user/MentorLanding"));

export const BusinessDashboard = lazy(() => import("@/pages/business/BusinessDashboard"));
export const BusinessProfile = lazy(() => import("@/pages/business/BusinessProfile"));
export const BusinessJobs = lazy(() => import("@/pages/business/BusinessJobs"));
export const TopCandidates = lazy(() => import("@/pages/business/TopCandidates"));
export const BusinessApplicants = lazy(() => import("@/pages/business/BusinessApplicants"));

export const MentorProfile = lazy(() => import("@/pages/mentor/MentorProfile"));
export const MentorDashboardShell = lazy(() => import("@/pages/mentor/MentorDashboardShell"));
export const MentorOverview = lazy(() => import("@/pages/mentor/MentorOverview"));
export const MentorAvailability = lazy(() => import("@/pages/mentor/MentorAvailability"));
export const MentorProfileSetup = lazy(() => import("@/pages/mentor/MentorProfileSetup"));
export const MentorRequests = lazy(() => import("@/pages/mentor/MentorRequests"));
export const MentorWorkspace = lazy(() => import("@/pages/mentor/MentorWorkspace"));
export const MentorRoom = lazy(() => import("@/pages/mentor/MentorRoom"));
export const MentorHistory = lazy(() => import("@/pages/mentor/MentorHistory"));
export const MentorReviews = lazy(() => import("@/pages/mentor/MentorReviews"));
export const MentorWallet = lazy(() => import("@/pages/mentor/MentorWallet"));

export const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
export const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
export const AdminInsights = lazy(() => import("@/pages/admin/AdminInsights"));
export const AdminUserManagement = lazy(() => import("@/pages/admin/AdminUserManagement"));
export const AdminUserProfile = lazy(() => import("@/pages/admin/AdminUserProfile"));
export const AdminCoreOperations = lazy(() => import("@/pages/admin/AdminCoreOperations"));
export const AdminCommerceFinance = lazy(() => import("@/pages/admin/AdminCommerceFinance"));
export const AdminCommunityManagement = lazy(() => import("@/pages/admin/AdminCommunityManagement"));
export const AdminSystemAdministration = lazy(() => import("@/pages/admin/AdminSystemAdministration"));
export const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));

// Dev-only mascot animation showcase (visit /mascot). Safe to remove later.
export const MascotShowcase = lazy(() => import("@/pages/dev/MascotShowcase"));
