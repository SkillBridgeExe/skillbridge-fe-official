import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AdminKpiCard from "@/components/admin/AdminKpiCard";
import AdminProgressRing from "@/components/admin/AdminProgressRing";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { AdminFunnelChartCard, AdminLineChartCard } from "@/components/admin/AdminCharts";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { REVENUE_DATA, TOP_COURSES } from "@/lib/mock-data/admin";
import { gsap } from "gsap";
import { Award, Clock, GraduationCap } from "lucide-react";

const OVERVIEW_SKILL_PROGRESS = [
//   { label: "React JS", percent: 33, colorClass: "text-primary", thumb: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=240&q=60" },
//   { label: "Node JS", percent: 27, colorClass: "text-cyan-500", thumb: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=240&q=60" },
//   { label: "Angular JS", percent: 45, colorClass: "text-violet-500", thumb: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=240&q=60" },
// ];

  { label: "React JS", percent: 33, colorClass: "text-primary", thumb: "" },
  { label: "Node JS", percent: 27, colorClass: "text-cyan-500", thumb: "" },
  { label: "Angular JS", percent: 45, colorClass: "text-violet-500", thumb: "" },
];

type CourseRow = (typeof TOP_COURSES)[number];

export default function AdminOverview() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const [localCourses, setLocalCourses] = useState<CourseRow[]>(() => TOP_COURSES);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    setLocalCourses(TOP_COURSES);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return localCourses.filter((c) => {
      const matchesQ = q.length === 0 ? true : `${c.title} ${c.category}`.toLowerCase().includes(q);
      const matchesStatus = status === "all" ? true : c.status === status;
      return matchesQ && matchesStatus;
    });
  }, [localCourses, search, status]);

  const funnelItems = useMemo(
    () => [
      { label: "CV", value: 124800 },
      { label: "Analysis", value: 18720 },
      { label: "Roadmap", value: 12480 },
      { label: "Mentor", value: 6240 },
      { label: "Interview", value: 3744 },
      { label: "Job", value: 1650 },
    ],
    []
  );

  const lineData = useMemo(() => {
    // Use revenue months as a proxy for "user growth trend" to keep mock data consistent.
    const months = REVENUE_DATA.map((m) => m.month);
    return months.map((m, idx) => ({
      month: m,
      users: Math.round(REVENUE_DATA[idx].revenue / 35 + 1200),
    }));
  }, []);

  const welcomeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = welcomeRef.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
    );
  }, []);

  const kpiAccents = useMemo(
    () => ({
      enrolled: {
        ringColorClass: "text-fuchsia-500",
        cardClassName: "bg-fuchsia-500/10",
      },
      completed: {
        ringColorClass: "text-violet-500",
        cardClassName: "bg-violet-500/10",
      },
      certs: {
        ringColorClass: "text-blue-500",
        cardClassName: "bg-blue-500/10",
      },
      hours: {
        ringColorClass: "text-emerald-500",
        cardClassName: "bg-emerald-500/10",
      },
    }),
    []
  );

  const coursesColumns = useMemo(
    () => [
      {
        key: "title",
        header: "Course",
        cell: (row: CourseRow) => (
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{row.title}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{row.category}</div>
          </div>
        ),
      },
      {
        key: "enrollments",
        header: "Enrolled",
        widthClassName: "w-24",
        cell: (row: CourseRow) => <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.enrollments.toLocaleString()}</div>,
      },
      {
        key: "completionRate",
        header: "Completion",
        widthClassName: "w-28",
        cell: (row: CourseRow) => <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.completionRate}%</div>,
      },
      {
        key: "revenue",
        header: "Revenue",
        widthClassName: "w-28",
        cell: (row: CourseRow) => <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">₫{Math.round(row.revenue / 1000000)}M</div>,
      },
      {
        key: "status",
        header: "Status",
        widthClassName: "w-32",
        cell: (row: CourseRow) => <AdminStatusBadge status={row.status} />,
      },
      {
        key: "actions",
        header: "Actions",
        widthClassName: "w-28",
        cell: (row: CourseRow) => (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl px-3"
            onClick={() => toast({ title: "✅ Open course", description: `${row.title} (mock)` })}
          >
            View
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-2xl px-6 py-3 shadow-sm border border-white/5">
        <span className="text-sm font-semibold">Campus activities and academic results are on track. Let’s aim even higher!</span>
      </div>

      {/* Welcome card */}
      <Card
        ref={welcomeRef}
        className="rounded-3xl border-0 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,1) 0%, rgba(124,58,237,1) 40%, rgba(59,130,246,1) 100%)",
        }}
      >
        <CardContent className="p-7">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-full bg-white/15 ring-1 ring-white/20 flex items-center justify-center overflow-hidden">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/30" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-white text-xl font-black leading-tight">Welcome back, {currentUser?.name?.split(" ")[0] ?? "Alex"}</div>
                <div className="text-white/80 text-sm font-semibold mt-0.5">Here’s your progress for this week!</div>
              </div>
            </div> */}

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex gap-4">
  {OVERVIEW_SKILL_PROGRESS.map((p) => (
    <div
      key={p.label}
      className="w-36 md:w-40 bg-white/10 border border-white/15 rounded-2xl px-4 py-4"
    >
      <div className="flex items-center gap-3">
        {/* <div className="w-11 h-11 rounded-xl overflow-hidden ring-1 ring-white/15 bg-white/10 flex-shrink-0">
          <img src={p.thumb} alt={p.label} className="w-full h-full object-cover" />
        </div> */}

        <div className="min-w-0">
          <div className="text-white text-base font-bold truncate">
            {p.label}
          </div>
          <div className="text-white/90 text-sm font-semibold">
            {p.percent}%
          </div>
        </div>
      </div>

      <div className="mt-3 h-2 bg-white/15 rounded-full overflow-hidden">
        <div
          className="h-full bg-white/90 rounded-full"
          style={{ width: `${p.percent}%` }}
        />
      </div>
    </div>
  ))}
</div>

              <div className="flex gap-5 md:gap-6 items-center">
  {[
    { title: "Training Hours", value: 98, ring: 65, icon: <Clock className="w-5 h-5 text-white" /> },
    { title: "Courses", value: 7, ring: 75, icon: <GraduationCap className="w-5 h-5 text-white" /> },
    { title: "Certifications", value: 3, ring: 92, icon: <Award className="w-5 h-5 text-white" /> },
  ].map((s) => (
    <div
      key={s.title}
      className="bg-white/10 border border-white/15 rounded-2xl px-5 py-4 w-51 md:w-55"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-white/85 text-sm font-semibold">
            {s.title}
          </div>
          <div className="text-white text-2xl font-black leading-tight">
            {s.value}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <AdminProgressRing
            value={s.ring}
            size={72}
            strokeWidth={9}
            colorClass="text-white"
            labelSuffix="%"
            labelClassName="text-[13px] font-black text-white"
          />
        </div>
      </div>
    </div>
  ))}
</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <AdminKpiCard
          title="Enrolled Courses"
          value="23"
          valueNumber={23}
          accent={{
            ringColorClass: kpiAccents.enrolled.ringColorClass,
            cardClassName: "bg-fuchsia-500/10",
          }}
          progress={75}
          valueSuffix=""
        />
        <AdminKpiCard
          title="Completed Courses"
          value="34"
          valueNumber={34}
          accent={{
            ringColorClass: kpiAccents.completed.ringColorClass,
            cardClassName: "bg-violet-500/10",
          }}
          progress={60}
        />
        <AdminKpiCard
          title="Certificates Earned"
          value="7"
          valueNumber={7}
          accent={{
            ringColorClass: kpiAccents.certs.ringColorClass,
            cardClassName: "bg-blue-500/10",
          }}
          progress={92}
        />
        <AdminKpiCard
          title="Learning Hours"
          value="89h"
          valueNumber={89}
          valueSuffix="h"
          accent={{
            ringColorClass: kpiAccents.hours.ringColorClass,
            cardClassName: "bg-emerald-500/10",
          }}
          progress={65}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="min-w-0">
          <AdminFunnelChartCard title="CV → Job Conversion" items={funnelItems} />
        </div>
        <div className="min-w-0">
          <AdminLineChartCard title="User growth trend" xKey="month" dataKey="users" data={lineData} />
        </div>
      </div>

      {/* Table + filter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">Course Enrollment</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Filter & drill into completion performance (mock).</div>
          </div>
        </div>
        <AdminFilterBar
          placeholder="Search course..."
          searchValue={search}
          onSearchChange={(v) => {
            setLoading(true);
            setSearch(v);
            window.setTimeout(() => setLoading(false), 250);
          }}
          statusValue={status}
          onStatusChange={(v) => {
            setLoading(true);
            setStatus(v);
            window.setTimeout(() => setLoading(false), 250);
          }}
          statusOptions={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "draft", label: "Draft" },
            { value: "archived", label: "Archived" },
          ]}
          onReset={() => {
            setSearch("");
            setStatus("all");
            toast({ title: "✅ Reset filters", description: "Dashboard state updated (mock)." });
          }}
          rightSlot={
            <Button type="button" className="rounded-xl" onClick={() => toast({ title: "✅ Export", description: "Export CSV (mock)" })}>
              Export CSV
            </Button>
          }
        />

        <AdminDataTable<CourseRow>
          columns={coursesColumns}
          rows={filtered}
          loading={loading}
          rowKey={(r) => r.id}
        />
      </div>
    </div>
  );
}

