import { useEffect, useMemo, useState } from "react";
import BusinessLayout from "./BusinessLayout";
import {
  Eye,
  FileText,
  Filter,
  Search,
  X,
  Beaker,
} from "lucide-react";

interface Candidate {
  rank: number;
  name: string;
  avatar: string;
  score: number;
  skills: string[];
  gpa: number;
  completedCourses: number;
  certifications: number;
  field: string;
  location: string;
  bio: string;
  openToWork: boolean;
}

const MOCK_CANDIDATES: Candidate[] = [
  { rank: 1, name: "Nguyen Minh Anh", avatar: "A", score: 97, skills: ["React", "TypeScript", "Node.js"], gpa: 3.9, completedCourses: 24, certifications: 5, field: "Frontend Dev", location: "Ho Chi Minh City", bio: "Final-year IT student passionate about web development", openToWork: true },
  { rank: 2, name: "Tran Phu Hung", avatar: "H", score: 95, skills: ["Python", "ML", "TensorFlow"], gpa: 3.8, completedCourses: 22, certifications: 4, field: "Data Science", location: "Hanoi", bio: "AI research at Hanoi University of Technology", openToWork: true },
  { rank: 3, name: "Le Khanh Vy", avatar: "V", score: 93, skills: ["Figma", "UX", "Prototyping"], gpa: 3.85, completedCourses: 20, certifications: 3, field: "UI/UX Design", location: "Ho Chi Minh City", bio: "Designer with 2 years of freelance experience", openToWork: false },
  { rank: 4, name: "Pham Quoc Bao", avatar: "B", score: 91, skills: ["Java", "Spring", "AWS"], gpa: 3.7, completedCourses: 19, certifications: 4, field: "Backend Dev", location: "Da Nang", bio: "Backend developer who loves clean code", openToWork: true },
  { rank: 5, name: "Hoang Thu Ha", avatar: "H", score: 90, skills: ["SQL", "Power BI", "Python"], gpa: 3.75, completedCourses: 18, certifications: 3, field: "Data Analyst", location: "Hanoi", bio: "Specializing in financial data analysis", openToWork: true },
  { rank: 6, name: "Vu Trong Khai", avatar: "K", score: 89, skills: ["iOS", "Swift", "Xcode"], gpa: 3.6, completedCourses: 17, certifications: 3, field: "Mobile Dev", location: "Ho Chi Minh City", bio: "Mobile developer with 3 apps on the App Store", openToWork: false },
  { rank: 7, name: "Dang Ngoc Linh", avatar: "L", score: 88, skills: ["Product", "Agile", "Analytics"], gpa: 3.7, completedCourses: 16, certifications: 2, field: "Product Manager", location: "Ho Chi Minh City", bio: "PM intern at an edtech startup", openToWork: true },
  { rank: 8, name: "Bui Thanh Tung", avatar: "T", score: 87, skills: ["Golang", "Docker", "K8s"], gpa: 3.65, completedCourses: 15, certifications: 3, field: "DevOps", location: "Hanoi", bio: "Passionate about cloud infrastructure", openToWork: true },
  { rank: 9, name: "Ngo Thi Mai", avatar: "M", score: 86, skills: ["Marketing", "SEO", "Analytics"], gpa: 3.55, completedCourses: 14, certifications: 2, field: "Digital Marketing", location: "Ho Chi Minh City", bio: "Marketing specialist and content creator", openToWork: true },
  { rank: 10, name: "Dinh Cong Minh", avatar: "M", score: 85, skills: ["React Native", "Redux", "API"], gpa: 3.6, completedCourses: 14, certifications: 2, field: "Mobile Dev", location: "Can Tho", bio: "Full-stack mobile developer", openToWork: false },
  { rank: 11, name: "Cao Thi Thao", avatar: "T", score: 84, skills: ["Branding", "Adobe", "Figma"], gpa: 3.5, completedCourses: 13, certifications: 2, field: "Graphic Design", location: "Hanoi", bio: "Designer with a love for branding and print", openToWork: true },
  { rank: 12, name: "Ly Hoang Long", avatar: "L", score: 83, skills: ["C++", "Unity", "Game Dev"], gpa: 3.55, completedCourses: 13, certifications: 1, field: "Game Dev", location: "Ho Chi Minh City", bio: "Indie game developer with 2 released games", openToWork: true },
  { rank: 13, name: "Tong Bao Chau", avatar: "C", score: 82, skills: ["Finance", "Excel", "VBA"], gpa: 3.45, completedCourses: 12, certifications: 2, field: "Finance", location: "Hanoi", bio: "Corporate finance and investment analysis", openToWork: false },
  { rank: 14, name: "Mac The Anh", avatar: "A", score: 81, skills: ["Kotlin", "Android", "Firebase"], gpa: 3.5, completedCourses: 12, certifications: 2, field: "Mobile Dev", location: "Ho Chi Minh City", bio: "Android developer who loves material design", openToWork: true },
  { rank: 15, name: "Ho Khanh Ngan", avatar: "N", score: 80, skills: ["Content", "Copywriting", "Social"], gpa: 3.4, completedCourses: 11, certifications: 1, field: "Content Creator", location: "Ho Chi Minh City", bio: "Content strategist with 50k followers", openToWork: true },
  { rank: 16, name: "Phung Duc Hieu", avatar: "H", score: 79, skills: ["Cybersecurity", "Pentest", "Linux"], gpa: 3.6, completedCourses: 11, certifications: 2, field: "Security", location: "Hanoi", bio: "CTF player focused on application security", openToWork: false },
  { rank: 17, name: "Truong Minh Tu", avatar: "T", score: 78, skills: ["Vue", "Nuxt", "CSS"], gpa: 3.4, completedCourses: 10, certifications: 1, field: "Frontend Dev", location: "Da Nang", bio: "Web developer who values clean UX", openToWork: true },
  { rank: 18, name: "Luong Thi Huong", avatar: "H", score: 77, skills: ["HR", "Recruitment", "Training"], gpa: 3.35, completedCourses: 10, certifications: 1, field: "Human Resources", location: "Ho Chi Minh City", bio: "HR specialist focused on talent acquisition", openToWork: true },
  { rank: 19, name: "Quan Duc Tai", avatar: "T", score: 76, skills: ["Rust", "WebAssembly", "C"], gpa: 3.45, completedCourses: 9, certifications: 2, field: "Systems Dev", location: "Hanoi", bio: "Low-level programming and performance optimization", openToWork: false },
  { rank: 20, name: "Duong Ngoc Anh", avatar: "A", score: 75, skills: ["Supply Chain", "ERP", "Logistics"], gpa: 3.3, completedCourses: 9, certifications: 1, field: "Operations", location: "Ho Chi Minh City", bio: "Supply chain and operations management", openToWork: true },
];

const RANK_COLORS = ["text-amber-500", "text-slate-400", "text-orange-500"] as const;
const RANK_BADGES = ["bg-yellow-50 border-yellow-200", "bg-slate-50 border-slate-200", "bg-amber-50 border-amber-200"] as const;
const AVATAR_GRADIENTS = [
  "from-sky-400 to-blue-600",
  "from-violet-400 to-purple-600",
  "from-emerald-400 to-teal-600",
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-600",
] as const;

const PAGE_SIZE = 10;

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
      >
        Previous
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }).map((_, idx) => {
          const p = idx + 1;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`h-8 min-w-8 rounded-md px-2 text-xs font-semibold ${
                page === p ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

function CandidateProfileModal({
  candidate,
  onClose,
}: {
  candidate: Candidate;
  onClose: () => void;
}) {
  const gradient = AVATAR_GRADIENTS[candidate.rank % AVATAR_GRADIENTS.length];
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Candidate Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl font-bold`}>
              {candidate.avatar}
            </div>
            <div>
              <h2 className="font-bold text-slate-900">{candidate.name}</h2>
              <p className="text-sm text-slate-500">{candidate.field}</p>
              <p className="text-xs text-slate-400">{candidate.location}</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-5 bg-slate-50 rounded-lg p-3">{candidate.bio}</p>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="text-center bg-slate-50 rounded-lg p-3">
              <p className="text-lg font-bold text-slate-900">{candidate.score}</p>
              <p className="text-xs text-slate-500">Score</p>
            </div>
            <div className="text-center bg-slate-50 rounded-lg p-3">
              <p className="text-lg font-bold text-slate-900">{candidate.gpa}</p>
              <p className="text-xs text-slate-500">GPA</p>
            </div>
            <div className="text-center bg-slate-50 rounded-lg p-3">
              <p className="text-lg font-bold text-slate-900">{candidate.certifications}</p>
              <p className="text-xs text-slate-500">Certs</p>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-xs font-medium text-slate-700 mb-2">Top Skills</p>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill) => (
                <span key={skill} className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-1 rounded-full font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              disabled
              title="Feature coming soon"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-400 bg-slate-50 cursor-not-allowed"
            >
              <FileText size={14} />
              View CV
            </button>
            <button
              disabled
              title="Feature coming soon"
              className="flex-1 py-2.5 bg-sky-100 text-sky-400 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              Invite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TopCandidates() {
  const [search, setSearch] = useState("");
  const [filterField, setFilterField] = useState("All");
  const [viewProfile, setViewProfile] = useState<Candidate | null>(null);
  const [page, setPage] = useState(1);

  const fields = ["All", ...Array.from(new Set(MOCK_CANDIDATES.map((candidate) => candidate.field)))];

  const filtered = useMemo(() => {
    return MOCK_CANDIDATES.filter((candidate) => {
      const matchSearch =
        candidate.name.toLowerCase().includes(search.toLowerCase()) ||
        candidate.field.toLowerCase().includes(search.toLowerCase()) ||
        candidate.skills.some((skill) => skill.toLowerCase().includes(search.toLowerCase()));
      const matchField = filterField === "All" || candidate.field === filterField;
      return matchSearch && matchField;
    });
  }, [search, filterField]);

  useEffect(() => {
    setPage(1);
  }, [search, filterField]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const start = filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(safePage * PAGE_SIZE, filtered.length);

  return (
    <BusinessLayout title="Top Candidates" subtitle="Discover high-ranking learners by skills and fit.">
      <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-start gap-3 mb-6">
        <Beaker className="text-amber-500 mt-0.5 shrink-0" size={20} />
        <div>
          <h3 className="font-semibold text-sm">Demo Preview</h3>
          <p className="text-xs mt-1">
            Candidate discovery is currently in preview. The profiles listed here are illustrative mock data to demonstrate the UI/UX capabilities of the candidate matching system. Live API integration is coming soon.
          </p>
        </div>
      </div>

      {viewProfile && <CandidateProfileModal candidate={viewProfile} onClose={() => setViewProfile(null)} />}

      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, skill, or field"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 bg-white"
              />
            </div>

            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary bg-white font-medium text-slate-700"
            >
              {fields.map((field) => (
                <option key={field}>{field}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Filter size={13} />
              Showing {start}-{end} of {filtered.length}
            </div>
          </div>
        </div>

        {filterField === "All" && search === "" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MOCK_CANDIDATES.slice(0, 3).map((candidate, index) => (
              <button
                key={candidate.rank}
                className={`bg-white rounded-xl border-2 p-4 text-center hover:shadow-sm transition-all ${RANK_BADGES[index]} text-left`}
                onClick={() => setViewProfile(candidate)}
              >
                <div className="text-2xl mb-1">{["🥇", "🥈", "🥉"][index]}</div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${AVATAR_GRADIENTS[index]} flex items-center justify-center text-white font-bold mx-auto mb-2`}>
                  {candidate.avatar}
                </div>
                <p className="text-xs font-bold text-slate-900 leading-tight text-center">{candidate.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 text-center">{candidate.field}</p>
                <p className={`text-xl font-black mt-2 text-center ${RANK_COLORS[index]}`}>{candidate.score}</p>
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {visible.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No candidates found for this filter.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {visible.map((candidate) => {
                const gradient = AVATAR_GRADIENTS[candidate.rank % AVATAR_GRADIENTS.length];
                return (
                  <div key={candidate.rank} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[24px_36px_minmax(0,1fr)_120px_56px_28px] sm:items-center sm:gap-3">
                      <div className={`text-sm font-bold text-center ${candidate.rank <= 3 ? RANK_COLORS[candidate.rank - 1] : "text-slate-400"}`}>
                        {candidate.rank <= 3 ? ["🥇", "🥈", "🥉"][candidate.rank - 1] : `#${candidate.rank}`}
                      </div>
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold`}>
                        {candidate.avatar}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">{candidate.name}</p>
                          {candidate.openToWork && (
                            <span className="hidden xl:inline-flex text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium">
                              Open to work
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{candidate.field} · {candidate.location}</p>
                      </div>

                      <div className="hidden md:flex gap-1.5 flex-wrap justify-end">
                        {candidate.skills.slice(0, 2).map((skill) => (
                          <span key={skill} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {skill}
                          </span>
                        ))}
                      </div>

                      <div className="text-right">
                        <p className="text-base font-black text-primary leading-none">{candidate.score}</p>
                        <p className="text-xs text-slate-400 mt-1">pts</p>
                      </div>

                      <button
                        onClick={() => setViewProfile(candidate)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </BusinessLayout>
  );
}
