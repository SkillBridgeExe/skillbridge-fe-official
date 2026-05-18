import { useEffect, useMemo, useState } from "react";
import BusinessLayout from "./BusinessLayout";
import {
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  MapPin,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
  X,
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  department: string;
  slots: number;
  location: string;
  type: string;
  salary: string;
  deadline: string;
  description: string;
  requirements: string;
  active: boolean;
  applicants: number;
}

const MOCK_JOBS: Job[] = [
  {
    id: "1",
    title: "Frontend Developer",
    department: "Engineering",
    slots: 3,
    location: "Ho Chi Minh City",
    type: "Full-time",
    salary: "$1,500-$2,500",
    deadline: "2026-04-30",
    description: "Build user interfaces with React and TypeScript.",
    requirements: "2+ years React experience, TypeScript, strong CSS skills",
    active: true,
    applicants: 24,
  },
  {
    id: "2",
    title: "Data Analyst",
    department: "Data",
    slots: 2,
    location: "Hanoi / Remote",
    type: "Full-time",
    salary: "$1,200-$2,000",
    deadline: "2026-05-15",
    description: "Analyze business data and build reporting dashboards.",
    requirements: "Proficient in SQL, Python, Power BI or Tableau",
    active: true,
    applicants: 15,
  },
  {
    id: "3",
    title: "Product Manager",
    department: "Product",
    slots: 1,
    location: "Ho Chi Minh City",
    type: "Full-time",
    salary: "$2,000-$3,500",
    deadline: "2026-04-15",
    description: "Manage product lifecycle from ideation to launch.",
    requirements: "3+ years as PM, experience with Agile/Scrum",
    active: false,
    applicants: 8,
  },
];

const EMPTY_JOB = {
  title: "",
  department: "",
  slots: 1,
  location: "",
  type: "Full-time",
  salary: "",
  deadline: "",
  description: "",
  requirements: "",
};

const PAGE_SIZE = 10;

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
      >
        Previous
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }).map((_, index) => {
          const page = index + 1;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`h-8 min-w-8 rounded-md px-2 text-xs font-semibold transition ${
                page === currentPage
                  ? "bg-sky-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {page}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

export default function BusinessJobs() {
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_JOB);
  const [submitted, setSubmitted] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [page, setPage] = useState(1);

  const handleField = (field: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.deadline) return;

    if (editId) {
      setJobs((prev) => prev.map((job) => (job.id === editId ? { ...job, ...form } : job)));
      setEditId(null);
    } else {
      setJobs((prev) => [
        ...prev,
        { ...form, id: Date.now().toString(), active: true, applicants: 0 },
      ]);
    }

    setForm(EMPTY_JOB);
    setShowForm(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const toggleActive = (id: string) => {
    setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, active: !job.active } : job)));
  };

  const deleteJob = (id: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== id));
  };

  const startEdit = (job: Job) => {
    setForm({
      title: job.title,
      department: job.department,
      slots: job.slots,
      location: job.location,
      type: job.type,
      salary: job.salary,
      deadline: job.deadline,
      description: job.description,
      requirements: job.requirements,
    });
    setEditId(job.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const matchesQuery =
        job.title.toLowerCase().includes(query.toLowerCase()) ||
        job.department.toLowerCase().includes(query.toLowerCase()) ||
        job.location.toLowerCase().includes(query.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && job.active) ||
        (statusFilter === "paused" && !job.active);
      return matchesQuery && matchesStatus;
    });
  }, [jobs, query, statusFilter]);

  const usePagination = filtered.length > PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedJobs = usePagination
    ? filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : filtered;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const startIndex = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = usePagination ? Math.min(safePage * PAGE_SIZE, filtered.length) : filtered.length;

  return (
    <BusinessLayout title="Job Listings" subtitle="Manage, publish, and monitor all open positions.">
      <div className="space-y-5">
        {submitted && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <CheckCircle size={16} className="text-emerald-600" />
            <p className="text-sm text-emerald-800 font-medium">
              Job posted successfully. Candidates can now apply.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <p className="text-sm text-slate-500">
              Showing {startIndex}-{endIndex} of {filtered.length} jobs
            </p>
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditId(null);
                setForm(EMPTY_JOB);
              }}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-all"
            >
              <Plus size={16} />
              Post New Job
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by title, department, location"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50"
              />
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "paused", label: "Paused" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setStatusFilter(item.key as typeof statusFilter);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md font-semibold ${
                    statusFilter === item.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-sky-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">
                {editId ? "Edit Job" : "Post New Job"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Job Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleField("title", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Department</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => handleField("department", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Open Slots</label>
                  <input
                    type="number"
                    min={1}
                    value={form.slots}
                    onChange={(e) => handleField("slots", parseInt(e.target.value || "1", 10))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Job Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => handleField("type", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 bg-white"
                  >
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Internship</option>
                    <option>Remote</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => handleField("location", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Salary</label>
                  <input
                    type="text"
                    value={form.salary}
                    onChange={(e) => handleField("salary", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  <Calendar size={11} className="inline mr-1" />
                  Application Deadline
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => handleField("deadline", e.target.value)}
                  className="w-full sm:w-56 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Job Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => handleField("description", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Requirements</label>
                  <textarea
                    rows={3}
                    value={form.requirements}
                    onChange={(e) => handleField("requirements", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditId(null);
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg shadow-sm"
                >
                  {editId ? "Save Changes" : "Publish Job"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {pagedJobs.map((job) => (
            <div
              key={job.id}
              className={`bg-white rounded-xl border transition-all ${
                job.active ? "border-slate-200" : "border-slate-200 opacity-70"
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-900">{job.title}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          job.active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {job.active ? "Active" : "Paused"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Users size={11} />
                        {job.slots} slot{job.slots !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin size={11} />
                        {job.location}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock size={11} />
                        Deadline: {new Date(job.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span className="text-xs text-sky-600 font-medium">
                        {job.applicants} applicant{job.applicants !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {job.description && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-1">{job.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(job.id)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      title={job.active ? "Pause" : "Activate"}
                    >
                      {job.active ? <ToggleRight size={18} className="text-sky-500" /> : <ToggleLeft size={18} />}
                    </button>
                    <button
                      onClick={() => startEdit(job)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => deleteJob(job.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <Briefcase size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No jobs match your current filters.</p>
            </div>
          )}
        </div>

        {usePagination && (
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>
    </BusinessLayout>
  );
}
