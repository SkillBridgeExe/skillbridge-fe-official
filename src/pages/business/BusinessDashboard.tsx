import { Link } from "react-router-dom";
import BusinessLayout from "./BusinessLayout";
import {
  Activity,
  Briefcase,
  Users,
  UserCheck,
  TrendingUp,
  Clock,
  CheckCircle,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

const STATS = [
  {
    icon: Briefcase,
    label: "Open Positions",
    value: "6",
    sub: "+2 this week",
    color: "sky",
  },
  {
    icon: Users,
    label: "Total Applicants",
    value: "142",
    sub: "34 new today",
    color: "violet",
  },
  {
    icon: UserCheck,
    label: "Qualified Candidates",
    value: "27",
    sub: "Ready for interview",
    color: "emerald",
  },
  {
    icon: TrendingUp,
    label: "Match Rate",
    value: "76%",
    sub: "18% above average",
    color: "amber",
  },
];

const STAT_COLORS = {
  sky: {
    icon: "bg-sky-100 text-sky-700",
    note: "text-sky-700",
  },
  violet: {
    icon: "bg-violet-100 text-violet-700",
    note: "text-violet-700",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-700",
    note: "text-emerald-700",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700",
    note: "text-amber-700",
  },
};

const PIPELINE = [
  {
    icon: Clock,
    label: "Pending review",
    value: "18",
    helper: "Needs action in 24h",
    style: "bg-amber-50 border-amber-200 text-amber-800",
  },
  {
    icon: Activity,
    label: "AI screening",
    value: "11",
    helper: "Auto reports in progress",
    style: "bg-violet-50 border-violet-200 text-violet-800",
  },
  {
    icon: CheckCircle,
    label: "Ready to contact",
    value: "9",
    helper: "High-fit shortlist",
    style: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
];

const RECENT_APPLICANTS = [
  { name: "Nguyen Minh Anh", role: "Frontend Developer", score: 94, status: "pending", time: "10m ago" },
  { name: "Tran Thi Bao", role: "Data Analyst", score: 88, status: "screening", time: "42m ago" },
  { name: "Le Hoang Nam", role: "Backend Engineer", score: 85, status: "approved", time: "2h ago" },
  { name: "Pham Khanh Linh", role: "Product Manager", score: 81, status: "pending", time: "Yesterday" },
];

const STATUS_CONFIG = {
  pending: { label: "Pending Review", color: "bg-primary/10 text-primary border-primary/20" },
  screening: { label: "AI Screening", color: "bg-primary/10 text-primary border-primary/20" },
  approved: { label: "Approved", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

const QUICK_ACTIONS = [
  { label: "Post a New Job", icon: Briefcase, path: "/business/jobs", desc: "Create a role and publish instantly" },
  { label: "Review Applicants", icon: CheckCircle, path: "/business/applicants", desc: "Screen and shortlist candidates" },
  { label: "Explore Top Candidates", icon: UserCheck, path: "/business/top-candidates", desc: "Find high-ranking learners quickly" },
];

export default function BusinessDashboard() {
  return (
    <BusinessLayout title="Overview" subtitle="Track hiring progress and act faster with a clear workflow.">
      <div className="space-y-6">
        {/* Notice banner */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Your company profile is still incomplete</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Completing your profile improves applicant trust and discoverability.{" "}
              <Link to="/business/profile" className="underline font-medium">Update now →</Link>
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATS.map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${STAT_COLORS[color as keyof typeof STAT_COLORS].icon}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
              <p className={`text-xs mt-1 font-medium ${STAT_COLORS[color as keyof typeof STAT_COLORS].note}`}>{sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PIPELINE.map(({ icon: Icon, label, value, helper, style }) => (
            <div key={label} className={`rounded-xl border p-4 ${style}`}>
              <div className="inline-flex w-9 h-9 items-center justify-center rounded-lg bg-white/80 mb-3">
                <Icon size={16} />
              </div>
              <p className="text-2xl font-black">{value}</p>
              <p className="text-sm font-semibold mt-1">{label}</p>
              <p className="text-xs mt-1 opacity-80">{helper}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent applicants */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Recent Applicants</h2>
                <p className="text-xs text-slate-500">Latest submitted applications</p>
              </div>
              <Link
                to="/business/applicants"
                className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
              >
                View all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {RECENT_APPLICANTS.map((a) => {
                const status = STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG];
                return (
                  <div key={a.name} className="px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_70px_140px_88px] sm:items-center sm:gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {a.name.split(" ").pop()?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{a.name}</p>
                          <p className="text-xs text-slate-500 truncate">{a.role}</p>
                        </div>
                      </div>

                      <div className="text-left sm:text-center">
                        <p className="text-sm font-bold text-slate-900 leading-none">{a.score}</p>
                        <p className="text-xs text-slate-400 mt-1">pts</p>
                      </div>

                      <div>
                        <span className={`inline-flex text-xs px-2 py-1 rounded-full border font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                        <Clock size={11} />
                        {a.time}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 px-1">Quick Actions</h2>
            {QUICK_ACTIONS.map(({ label, icon: Icon, path, desc }) => (
              <Link
                key={path}
                to={path}
                className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-4 py-4 hover:border-primary/30 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Icon size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}