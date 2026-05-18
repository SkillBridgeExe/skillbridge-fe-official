import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import {
  Search,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Building2,
  Users,
  Star,
  ChevronDown,
  SlidersHorizontal,
  X,
  Bookmark,
  BookmarkCheck,
  TrendingUp,
  Zap,
  Globe,
  CheckCircle,
  Filter,
  ArrowUpRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────
interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo: string;
  companyColor: string;
  location: string;
  type: string;
  salary: string;
  salaryNum: number;
  industry: string;
  skills: string[];
  slots: number;
  deadline: string;
  postedDays: number;
  description: string;
  isHot: boolean;
  isNew: boolean;
  companySize: string;
  companyRating: number;
  companyReviews: number;
  matchScore: number;
}

// ─── Mock Data ───────────────────────────────
const MOCK_JOBS: Job[] = [
  {
    id: "1", title: "Senior Frontend Developer", company: "TechViet Solutions",
    companyLogo: "TV", companyColor: "#3b82f6", location: "Ho Chi Minh City",
    type: "Full-time", salary: "$2,000 – $3,500", salaryNum: 2750,
    industry: "Information Technology", skills: ["React", "TypeScript", "Next.js", "Tailwind"],
    slots: 3, deadline: "2025-05-15", postedDays: 2, isHot: true, isNew: false,
    description: "Join our product team to build world-class web applications serving millions of users across Southeast Asia.",
    companySize: "200–500", companyRating: 4.7, companyReviews: 128, matchScore: 96,
  },
  {
    id: "2", title: "Data Analyst", company: "FinanceHub Vietnam",
    companyLogo: "FH", companyColor: "#10b981", location: "Hanoi",
    type: "Full-time", salary: "$1,200 – $2,000", salaryNum: 1600,
    industry: "Finance & Banking", skills: ["SQL", "Python", "Power BI", "Excel"],
    slots: 2, deadline: "2025-05-30", postedDays: 5, isHot: false, isNew: false,
    description: "Analyze financial data, build dashboards and generate insights to support business decisions.",
    companySize: "500–1000", companyRating: 4.4, companyReviews: 74, matchScore: 88,
  },
  {
    id: "3", title: "UI/UX Designer", company: "CreativeLab Studio",
    companyLogo: "CL", companyColor: "#f59e0b", location: "Ho Chi Minh City",
    type: "Full-time", salary: "$1,500 – $2,500", salaryNum: 2000,
    industry: "Design & Creative", skills: ["Figma", "Prototyping", "User Research", "Adobe XD"],
    slots: 1, deadline: "2025-04-28", postedDays: 1, isHot: false, isNew: true,
    description: "Design intuitive and beautiful digital experiences for our portfolio of consumer applications.",
    companySize: "50–200", companyRating: 4.8, companyReviews: 41, matchScore: 82,
  },
  {
    id: "4", title: "Product Manager", company: "E-Commerce Giant",
    companyLogo: "EG", companyColor: "#f97316", location: "Ho Chi Minh City",
    type: "Full-time", salary: "$2,500 – $4,000", salaryNum: 3250,
    industry: "E-Commerce", skills: ["Agile", "Product Roadmap", "Analytics", "Stakeholder Mgmt"],
    slots: 1, deadline: "2025-05-10", postedDays: 3, isHot: true, isNew: false,
    description: "Drive product strategy for our rapidly growing marketplace platform.",
    companySize: "1000+", companyRating: 4.2, companyReviews: 312, matchScore: 79,
  },
  {
    id: "5", title: "Backend Engineer (Node.js)", company: "CloudBase Technologies",
    companyLogo: "CB", companyColor: "#8b5cf6", location: "Remote",
    type: "Remote", salary: "$1,800 – $3,000", salaryNum: 2400,
    industry: "Information Technology", skills: ["Node.js", "PostgreSQL", "Docker", "AWS"],
    slots: 4, deadline: "2025-06-01", postedDays: 0, isHot: false, isNew: true,
    description: "Build scalable microservices and APIs powering our next-generation cloud platform.",
    companySize: "50–200", companyRating: 4.6, companyReviews: 55, matchScore: 91,
  },
  {
    id: "6", title: "Digital Marketing Specialist", company: "GrowthMark Agency",
    companyLogo: "GM", companyColor: "#ec4899", location: "Da Nang",
    type: "Full-time", salary: "$900 – $1,500", salaryNum: 1200,
    industry: "Marketing", skills: ["SEO", "Google Ads", "Meta Ads", "Analytics"],
    slots: 2, deadline: "2025-05-20", postedDays: 7, isHot: false, isNew: false,
    description: "Drive customer acquisition and brand awareness across digital channels for our clients.",
    companySize: "10–50", companyRating: 4.3, companyReviews: 22, matchScore: 74,
  },
  {
    id: "7", title: "DevOps Engineer", company: "InfraScale",
    companyLogo: "IS", companyColor: "#06b6d4", location: "Ho Chi Minh City",
    type: "Full-time", salary: "$2,000 – $3,200", salaryNum: 2600,
    industry: "Information Technology", skills: ["Kubernetes", "Terraform", "CI/CD", "Linux"],
    slots: 2, deadline: "2025-05-25", postedDays: 4, isHot: true, isNew: false,
    description: "Architect and maintain cloud infrastructure ensuring 99.99% uptime for enterprise clients.",
    companySize: "200–500", companyRating: 4.5, companyReviews: 89, matchScore: 85,
  },
  {
    id: "8", title: "Mobile Developer (React Native)", company: "AppForge Vietnam",
    companyLogo: "AF", companyColor: "#14b8a6", location: "Hanoi",
    type: "Full-time", salary: "$1,500 – $2,500", salaryNum: 2000,
    industry: "Information Technology", skills: ["React Native", "Redux", "iOS", "Android"],
    slots: 2, deadline: "2025-05-18", postedDays: 6, isHot: false, isNew: false,
    description: "Build cross-platform mobile apps used by over 500,000 active users daily.",
    companySize: "50–200", companyRating: 4.4, companyReviews: 47, matchScore: 77,
  },
  {
    id: "9", title: "HR Business Partner", company: "PeopleFirst Corp",
    companyLogo: "PF", companyColor: "#a855f7", location: "Ho Chi Minh City",
    type: "Full-time", salary: "$1,000 – $1,800", salaryNum: 1400,
    industry: "Human Resources", skills: ["Recruitment", "Talent Development", "HRIS", "Labor Law"],
    slots: 1, deadline: "2025-05-12", postedDays: 8, isHot: false, isNew: false,
    description: "Partner with department heads to align people strategies with business objectives.",
    companySize: "200–500", companyRating: 4.1, companyReviews: 63, matchScore: 68,
  },
  {
    id: "10", title: "Content Strategist", company: "MediaNexus",
    companyLogo: "MN", companyColor: "#ef4444", location: "Remote",
    type: "Part-time", salary: "$700 – $1,200", salaryNum: 950,
    industry: "Marketing", skills: ["Copywriting", "SEO", "Content Planning", "Social Media"],
    slots: 3, deadline: "2025-05-28", postedDays: 2, isHot: false, isNew: true,
    description: "Create compelling content strategies and editorial calendars for our diverse client portfolio.",
    companySize: "10–50", companyRating: 4.2, companyReviews: 18, matchScore: 71,
  },
  {
    id: "11", title: "Machine Learning Engineer", company: "AI Nexus Labs",
    companyLogo: "AN", companyColor: "#6366f1", location: "Ho Chi Minh City",
    type: "Full-time", salary: "$2,500 – $4,500", salaryNum: 3500,
    industry: "Information Technology", skills: ["Python", "TensorFlow", "PyTorch", "MLOps"],
    slots: 2, deadline: "2025-06-15", postedDays: 0, isHot: true, isNew: true,
    description: "Research and deploy machine learning models that power our AI-driven product suite.",
    companySize: "50–200", companyRating: 4.9, companyReviews: 33, matchScore: 93,
  },
  {
    id: "12", title: "Supply Chain Analyst", company: "LogiTech Vietnam",
    companyLogo: "LT", companyColor: "#84cc16", location: "Hanoi",
    type: "Full-time", salary: "$1,000 – $1,600", salaryNum: 1300,
    industry: "Logistics", skills: ["ERP", "Supply Chain", "Excel", "Data Analysis"],
    slots: 2, deadline: "2025-05-22", postedDays: 9, isHot: false, isNew: false,
    description: "Optimize supply chain operations and inventory management across our distribution network.",
    companySize: "500–1000", companyRating: 3.9, companyReviews: 97, matchScore: 65,
  },
];

const INDUSTRIES = [
  "All Industries",
  "Information Technology",
  "Finance & Banking",
  "E-Commerce",
  "Marketing",
  "Design & Creative",
  "Human Resources",
  "Logistics",
];

const LOCATIONS = ["All Locations", "Ho Chi Minh City", "Hanoi", "Da Nang", "Remote"];
const JOB_TYPES = ["All Types", "Full-time", "Part-time", "Remote", "Internship"];
const SALARY_RANGES = [
  { label: "Any Salary", min: 0 },
  { label: "From $500+", min: 500 },
  { label: "From $1,000+", min: 1000 },
  { label: "From $1,500+", min: 1500 },
  { label: "From $2,000+", min: 2000 },
  { label: "From $2,500+", min: 2500 },
];
const SORT_OPTIONS = ["Best Match", "Newest", "Highest Salary", "Most Reviews"];

// ─── Custom Dropdown ─────────────────────────
interface DropdownOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  /** "dark" = for hero banner (glass style), "light" = white bg toolbar */
  variant?: "dark" | "light";
  placeholder?: string;
  align?: "left" | "right";
}

function CustomDropdown({
  value,
  options,
  onChange,
  icon,
  variant = "light",
  align = "left",
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const selected = options.find(o => o.value === value) || options[0];

  const isDark = variant === "dark";

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 transition-all duration-150 rounded-xl px-3 py-2 ${
          isDark
            ? "backdrop-blur-sm text-slate-200 hover:bg-white/10"
            : open
            ? "bg-sky-50 border border-sky-300 text-sky-700"
            : "bg-white border border-slate-200 text-slate-700 hover:border-sky-300"
        }`}
        style={isDark ? { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" } : {}}
      >
        {icon && (
          <span className={isDark ? "text-sky-300" : "text-slate-400"}>
            {icon}
          </span>
        )}
        <span className={`text-sm font-medium whitespace-nowrap ${isDark ? "text-slate-100" : ""}`}>
          {selected.label}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 flex-shrink-0 ${
            open ? "rotate-180" : ""
          } ${isDark ? "text-slate-300" : "text-slate-400"}`}
        />
      </button>

      {/* Panel */}
      {open && (
        <div
          className={`absolute z-50 mt-2 py-1.5 rounded-2xl shadow-xl border overflow-hidden ${
            align === "right" ? "right-0" : "left-0"
          }`}
          style={{
            minWidth: 180,
            background: "rgba(255,255,255,0.98)",
            backdropFilter: "blur(16px)",
            borderColor: "rgba(226,232,240,0.8)",
            boxShadow: "0 8px 32px -4px rgba(15,23,42,0.12), 0 2px 8px -2px rgba(15,23,42,0.06)",
            animation: "dropdownIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Subtle header line */}
          <div className="px-3 pb-1.5 mb-0.5">
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          </div>

          <div className="max-h-64 overflow-y-auto px-1.5">
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-100 group ${
                    isSelected
                      ? "bg-sky-500 text-white"
                      : "text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                  style={{ animationDelay: `${i * 20}ms` }}
                >
                  {/* Selection indicator */}
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${
                    isSelected ? "bg-white" : "bg-transparent"
                  }`} />

                  {/* Icon if any */}
                  {opt.icon && (
                    <span className={isSelected ? "text-white" : "text-slate-400 group-hover:text-sky-500"}>
                      {opt.icon}
                    </span>
                  )}

                  <span className="text-sm font-medium">{opt.label}</span>

                  {isSelected && (
                    <CheckCircle size={13} className="ml-auto text-white/80 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Job Card ────────────────────────────────
function JobCard({ job, saved, onSave }: { job: Job; saved: boolean; onSave: (id: string) => void }) {
  return (
    <div className="group bg-white border border-slate-100 rounded-2xl p-5 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-50 transition-all duration-300 relative overflow-hidden">
      {/* Hot/New badge */}
      {(job.isHot || job.isNew) && (
        <div className={`absolute top-0 right-0 text-[10px] font-bold px-3 py-1 rounded-bl-xl ${job.isHot ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"}`}>
          {job.isHot ? "🔥 HOT" : "✨ NEW"}
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Company logo */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm"
          style={{ backgroundColor: job.companyColor }}
        >
          {job.companyLogo}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors leading-snug">
              {job.title}
            </h3>
            <button
              onClick={() => onSave(job.id)}
              className="flex-shrink-0 p-1 text-slate-300 hover:text-sky-500 transition-colors mt-0.5"
            >
              {saved ? <BookmarkCheck size={16} className="text-sky-500" /> : <Bookmark size={16} />}
            </button>
          </div>

          {/* Company + rating */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold text-slate-600">{job.company}</span>
            <div className="flex items-center gap-0.5">
              <Star size={10} className="fill-amber-400 text-amber-400" />
              <span className="text-[11px] text-amber-600 font-semibold">{job.companyRating}</span>
              <span className="text-[11px] text-slate-400">({job.companyReviews})</span>
            </div>
          </div>

          {/* Meta pills */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              <MapPin size={10} /> {job.location}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              <Briefcase size={10} /> {job.type}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-semibold">
              <DollarSign size={10} /> {job.salary}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              <Users size={10} /> {job.slots} slot{job.slots > 1 ? "s" : ""}
            </span>
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {job.skills.slice(0, 3).map(skill => (
              <span key={skill} className="text-[11px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md font-medium border border-sky-100">
                {skill}
              </span>
            ))}
            {job.skills.length > 3 && (
              <span className="text-[11px] text-slate-400 px-1">+{job.skills.length - 3}</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-slate-50">
        <div className="flex items-center gap-3">
          {/* Match score */}
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500"
                style={{ width: `${job.matchScore}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-sky-600">{job.matchScore}% match</span>
          </div>
          <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
            <Clock size={10} />
            {job.postedDays === 0 ? "Today" : `${job.postedDays}d ago`}
          </span>
        </div>
        <Link
          to={`/jobs/${job.id}`}
          className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 group/btn"
        >
          Apply now
          <ArrowUpRight size={13} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────
export default function Jobs() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("All Industries");
  const [location, setLocation] = useState("All Locations");
  const [jobType, setJobType] = useState("All Types");
  const [minSalary, setMinSalary] = useState(0);
  const [sortBy, setSortBy] = useState("Best Match");
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [onlyHot, setOnlyHot] = useState(false);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const heroRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMouse({ x, y });
  }, []);

  const toggleSave = (id: string) => {
    setSavedJobs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = MOCK_JOBS.filter(j => {
      const q = search.toLowerCase();
      const matchSearch = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.skills.some(s => s.toLowerCase().includes(q));
      const matchIndustry = industry === "All Industries" || j.industry === industry;
      const matchLocation = location === "All Locations" || j.location === location;
      const matchType = jobType === "All Types" || j.type === jobType;
      const matchSalary = j.salaryNum >= minSalary;
      const matchNew = !onlyNew || j.isNew;
      const matchHot = !onlyHot || j.isHot;
      return matchSearch && matchIndustry && matchLocation && matchType && matchSalary && matchNew && matchHot;
    });

    if (sortBy === "Newest") list = [...list].sort((a, b) => a.postedDays - b.postedDays);
    else if (sortBy === "Highest Salary") list = [...list].sort((a, b) => b.salaryNum - a.salaryNum);
    else if (sortBy === "Most Reviews") list = [...list].sort((a, b) => b.companyReviews - a.companyReviews);
    else list = [...list].sort((a, b) => b.matchScore - a.matchScore);

    return list;
  }, [search, industry, location, jobType, minSalary, sortBy, onlyNew, onlyHot]);

  const activeFilterCount = [
    industry !== "All Industries",
    location !== "All Locations",
    jobType !== "All Types",
    minSalary > 0,
    onlyNew,
    onlyHot,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setIndustry("All Industries");
    setLocation("All Locations");
    setJobType("All Types");
    setMinSalary(0);
    setOnlyNew(false);
    setOnlyHot(false);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        {/* ── Hero Banner ── */}
        <div
          ref={heroRef}
          onMouseMove={handleMouseMove}
          className="relative pt-28 pb-16 px-6 overflow-hidden select-none"
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #0c1a2e 40%, #0d1f3c 70%, #0f172a 100%)",
          }}
        >
          {/* ── Animated gradient blobs following mouse ── */}
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-700 ease-out"
            style={{
              background: `
                radial-gradient(ellipse 55% 45% at ${mouse.x}% ${mouse.y}%,
                  rgba(14,165,233,0.18) 0%,
                  transparent 65%
                ),
                radial-gradient(ellipse 40% 50% at ${100 - mouse.x * 0.6}% ${mouse.y * 0.7 + 20}%,
                  rgba(99,102,241,0.13) 0%,
                  transparent 60%
                ),
                radial-gradient(ellipse 35% 40% at ${mouse.x * 0.4 + 30}% ${100 - mouse.y * 0.5}%,
                  rgba(20,184,166,0.10) 0%,
                  transparent 55%
                )
              `,
            }}
          />

          {/* ── Static ambient glows ── */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-[600px] h-[400px] opacity-20"
              style={{ background: "radial-gradient(ellipse at 20% 0%, rgba(56,189,248,0.4) 0%, transparent 60%)" }} />
            <div className="absolute bottom-0 right-0 w-[500px] h-[300px] opacity-15"
              style={{ background: "radial-gradient(ellipse at 80% 100%, rgba(139,92,246,0.5) 0%, transparent 60%)" }} />
          </div>

          {/* ── Dot grid texture ── */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* ── Thin top accent line ── */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />

          {/* ── Content ── */}
          <div className="max-w-5xl mx-auto relative z-10">
            {/* Badge */}
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border backdrop-blur-sm"
                style={{
                  background: "rgba(14,165,233,0.12)",
                  borderColor: "rgba(14,165,233,0.25)",
                  color: "#7dd3fc",
                }}>
                <Zap size={11} className="fill-yellow-300 text-yellow-300" />
                {MOCK_JOBS.length} jobs matched to your profile
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-3xl md:text-[2.75rem] font-black leading-tight mb-3 tracking-tight">
              <span className="text-white">Find your next </span>
              <span style={{
                background: "linear-gradient(90deg, #38bdf8 0%, #818cf8 50%, #34d399 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                opportunity
              </span>
            </h1>
            <p className="text-sm mb-8 max-w-xl leading-relaxed" style={{ color: "#94a3b8" }}>
              Top companies are actively hiring SkillBridge graduates. Your learning score unlocks higher-match positions.
            </p>

            {/* Search bar */}
            <div className="flex gap-2 rounded-2xl p-1.5 shadow-2xl"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                backdropFilter: "blur(16px)",
              }}>
              <div className="flex-1 flex items-center gap-2 px-4 bg-white rounded-xl">
                <Search size={17} className="text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Job title, company, or skill..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 text-sm text-slate-700 placeholder-slate-400 outline-none bg-transparent py-3"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-slate-300 hover:text-slate-500 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="hidden sm:flex items-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <CustomDropdown
                  value={location}
                  options={LOCATIONS.map(l => ({ label: l, value: l }))}
                  onChange={setLocation}
                  icon={<MapPin size={15} />}
                  variant="dark"
                />
              </div>
              <button
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95 flex items-center gap-2 flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
                  boxShadow: "0 4px 24px rgba(14,165,233,0.35)",
                }}
              >
                <Search size={15} />
                Search
              </button>
            </div>

            {/* Popular tags */}
            <div className="flex flex-wrap gap-2 mt-5 items-center">
              <span className="text-xs font-medium" style={{ color: "#64748b" }}>Popular:</span>
              {["React", "Python", "Product Manager", "Data Analyst", "Remote"].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSearch(tag)}
                  className="text-xs px-3 py-1 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "#94a3b8",
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* ── Bottom fade ── */}
          <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(248,250,252,0.08))" }} />
        </div>

        {/* ── Stats Bar ── */}
        <div className="bg-white border-b border-slate-100 shadow-[0_1px_12px_rgba(0,0,0,0.06)]">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-6 flex-wrap">
              {[
                { icon: Building2, label: "Companies hiring", val: "47" },
                { icon: Briefcase, label: "Open positions", val: "312" },
                { icon: TrendingUp, label: "New this week", val: "28" },
                { icon: Globe, label: "Remote jobs", val: "94" },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon size={14} className="text-sky-500" />
                  <span className="text-sm font-bold text-slate-800">{val}</span>
                  <span className="text-xs text-slate-500">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <CheckCircle size={13} />
              All jobs verified by SkillBridge
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="max-w-7xl mx-auto px-6 py-8 flex gap-7">
          {/* ── Sidebar Filters ── */}
          <aside className={`
            flex-shrink-0 w-64 space-y-5
            ${showFilters ? "block" : "hidden"} lg:block
          `}>
            {/* Filter header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal size={15} className="text-sky-500" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-sky-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </h2>
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1">
                  <X size={12} /> Reset
                </button>
              )}
            </div>

            {/* Industry */}
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Industry</h3>
              <div className="space-y-1.5">
                {INDUSTRIES.map(ind => (
                  <button
                    key={ind}
                    onClick={() => setIndustry(ind)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-all font-medium ${
                      industry === ind
                        ? "bg-sky-50 text-sky-700 border border-sky-200"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {ind}
                    <span className="float-right text-slate-400 text-[10px]">
                      {ind === "All Industries" ? MOCK_JOBS.length : MOCK_JOBS.filter(j => j.industry === ind).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Location</h3>
              <div className="space-y-1.5">
                {LOCATIONS.map(loc => (
                  <button
                    key={loc}
                    onClick={() => setLocation(loc)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-all font-medium ${
                      location === loc
                        ? "bg-sky-50 text-sky-700 border border-sky-200"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Job Type */}
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Job Type</h3>
              <div className="space-y-1.5">
                {JOB_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setJobType(type)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-all font-medium ${
                      jobType === type
                        ? "bg-sky-50 text-sky-700 border border-sky-200"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Salary */}
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Minimum Salary</h3>
              <div className="space-y-1.5">
                {SALARY_RANGES.map(range => (
                  <button
                    key={range.label}
                    onClick={() => setMinSalary(range.min)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-all font-medium ${
                      minSalary === range.min
                        ? "bg-sky-50 text-sky-700 border border-sky-200"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick toggles */}
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Quick Filters</h3>
              <div className="space-y-2">
                {[
                  { label: "🔥 Hot jobs only", state: onlyHot, toggle: () => setOnlyHot(!onlyHot) },
                  { label: "✨ New postings only", state: onlyNew, toggle: () => setOnlyNew(!onlyNew) },
                ].map(({ label, state, toggle }) => (
                  <label key={label} className="flex items-center justify-between cursor-pointer group">
                    <span className="text-xs text-slate-600 font-medium group-hover:text-slate-800">{label}</span>
                    <button
                      onClick={toggle}
                      className={`w-9 h-5 rounded-full transition-all relative ${state ? "bg-sky-500" : "bg-slate-200"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${state ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Job List ── */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-sky-300 transition-all"
                >
                  <Filter size={14} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 bg-sky-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <p className="text-sm text-slate-600">
                  <span className="font-bold text-slate-900">{filtered.length}</span> jobs found
                  {search && <span className="text-slate-400"> for "{search}"</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Sort by:</span>
                <CustomDropdown
                  value={sortBy}
                  options={SORT_OPTIONS.map(o => ({ label: o, value: o }))}
                  onChange={setSortBy}
                  variant="light"
                  align="right"
                />
              </div>
            </div>

            {/* Featured companies strip */}
            {!search && industry === "All Industries" && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Top Hiring Companies
                  </h2>
                  <span className="text-xs text-slate-400">Based on your profile</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
                  {MOCK_JOBS.slice(0, 6).map(job => (
                    <div
                      key={job.id}
                      className="flex-shrink-0 flex flex-col items-center gap-1.5 cursor-pointer group"
                      onClick={() => setSearch(job.company)}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all"
                        style={{ backgroundColor: job.companyColor }}
                      >
                        {job.companyLogo}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium text-center leading-tight w-14 truncate">{job.company.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Job cards grid */}
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filtered.map(job => (
                  <JobCard key={job.id} job={job} saved={savedJobs.has(job.id)} onSave={toggleSave} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Search size={24} className="text-slate-300" />
                </div>
                <p className="text-base font-semibold text-slate-700 mb-1">No jobs found</p>
                <p className="text-sm text-slate-400 mb-4">Try adjusting your search or filters</p>
                <button
                  onClick={() => { setSearch(""); resetFilters(); }}
                  className="text-sm text-sky-600 font-semibold hover:text-sky-700 underline"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Saved jobs note */}
            {savedJobs.size > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-sky-50 border border-sky-100 rounded-xl px-4 py-3">
                <BookmarkCheck size={14} className="text-sky-500" />
                <span>You have <strong className="text-sky-700">{savedJobs.size}</strong> saved job{savedJobs.size > 1 ? "s" : ""}.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
