import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserPlus, CalendarOff, CheckCircle2 } from "lucide-react";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { RECENT_USERS } from "@/lib/mock-data/admin";

type Role = "user" | "mentor" | "business" | "admin" | "all";
type Status = "active" | "pending" | "suspended";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Exclude<Role, "all">;
  status: Status;
  joinDate: string;
  coursesEnrolled?: number;
  revenue?: number;
};

function roleLabel(role: Exclude<Role, "all">) {
  switch (role) {
    case "user": return "Student";
    case "mentor": return "Mentor";
    case "business": return "Business";
    case "admin": return "Admin";
  }
}

export default function AdminUserManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlRole = searchParams.get("role") as Role | null;
  const initialRole = (["all", "user", "mentor", "business", "admin"].includes(urlRole || "")) ? urlRole as Role : "all";

  const [roleFilter, setRoleFilter] = useState<Role>(initialRole);
  
  useEffect(() => {
    if (urlRole && ["all", "user", "mentor", "business", "admin"].includes(urlRole)) {
      setRoleFilter(urlRole as Role);
    } else {
      setRoleFilter("all");
    }
  }, [urlRole]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [dateQuery, setDateQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const initialRows = useMemo<UserRow[]>(() => {
    return RECENT_USERS.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as Exclude<Role, "all">,
      status: u.status as Status,
      joinDate: u.joinDate,
      coursesEnrolled: u.coursesEnrolled,
      revenue: u.revenue,
    }));
  }, []);

  const rows = initialRows;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => (roleFilter === "all" ? true : r.role === roleFilter))
      .filter((r) => (status === "all" ? true : r.status === status))
      .filter((r) => (dateQuery ? r.joinDate.includes(dateQuery) : true))
      .filter((r) => (q.length === 0 ? true : `${r.name} ${r.email}`.toLowerCase().includes(q)));
  }, [rows, roleFilter, search, status, dateQuery]);

  const openDetail = (row: UserRow) => {
    navigate(`/admin/users/${row.id}?role=${row.role}`);
  };

  const columns = useMemo(() => {
    return [
      {
        key: "name",
        header: "Name / Identifier",
        cell: (r: UserRow) => (
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{r.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{r.email}</div>
          </div>
        ),
      },
      {
        key: "role",
        header: "Role",
        widthClassName: "w-28",
        cell: (r: UserRow) => <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{roleLabel(r.role)}</div>,
      },
      {
        key: "status",
        header: "Status",
        widthClassName: "w-32",
        cell: (r: UserRow) => <AdminStatusBadge status={r.status} />,
      },
      {
        key: "joinDate",
        header: "Joined Date",
        widthClassName: "w-36",
        cell: (r: UserRow) => <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{r.joinDate}</div>,
      },
      {
        key: "actions",
        header: "Actions",
        widthClassName: "w-44",
        cell: () => (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl px-3"
            >
              Update
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl px-2 text-red-600 hover:text-red-700"
            >
              Delete
            </Button>
          </div>
        ),
      },
    ];
  }, []);

  const getStatsTitle = () => {
    switch (roleFilter) {
      case "mentor": return "Mentors";
      case "business": return "Businesses";
      case "user": return "Students";
      case "admin": return "Admins";
      default: return "System";
    }
  };

  return (
    <div className="space-y-6 pb-10 font-sans">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">Manage {getStatsTitle()}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage and track the directory of {getStatsTitle().toLowerCase()}.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" className="rounded-xl">
            Create new account
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 border-t-4 border-t-purple-500 shadow-sm">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{filteredRows.length}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total</div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 border-t-4 border-t-emerald-500 shadow-sm">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {filteredRows.filter(r => r.joinDate.includes('ago') || r.joinDate.includes('now')).length || 2}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">New Joined</div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 border-t-4 border-t-red-500 shadow-sm">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
            <div className="p-3 bg-red-50 text-red-600 rounded-full">
              <CalendarOff className="w-6 h-6" />
            </div>
            <div>
               <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{Math.floor(filteredRows.length * 0.1) || 1}</div>
               <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Time Off</div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 dark:border-slate-700 border-t-4 border-t-yellow-500 shadow-sm">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-full">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
               <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{Math.max(1, Math.ceil(filteredRows.length * 0.9))}</div>
               <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active (Present)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 mt-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="w-full md:w-64">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Role Filter</div>
            <Select 
              value={roleFilter} 
              onValueChange={(v) => { 
                setLoading(true); 
                setSearchParams(v === "all" ? {} : { role: v });
                setTimeout(() => setLoading(false), 200);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="mentor">Mentor</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <AdminFilterBar
              placeholder="Search Email / Name..."
              searchValue={search}
              onSearchChange={(v) => {
                setLoading(true);
                setSearch(v);
                window.setTimeout(() => setLoading(false), 200);
              }}
              statusValue={status}
              onStatusChange={(v) => {
                setLoading(true);
                setStatus(v);
                window.setTimeout(() => setLoading(false), 200);
              }}
              statusOptions={[
                { value: "all", label: "All Statuses" },
                { value: "active", label: "Active" },
                { value: "pending", label: "Pending" },
                { value: "suspended", label: "Suspended" },
              ]}
              dateValue={dateQuery}
              onDateChange={(v) => {
                setLoading(true);
                setDateQuery(v);
                window.setTimeout(() => setLoading(false), 200);
              }}
              onReset={() => {
                setSearch("");
                setStatus("all");
                setDateQuery("");
                setSearchParams({});
                toast({ title: "✅ Reset", description: "Filters cleared." });
              }}
            />
          </div>
        </div>

        <AdminDataTable<UserRow>
          columns={columns}
          rows={filteredRows}
          loading={loading}
          rowKey={(r) => r.id}
          onRowClick={(r) => openDetail(r)}
          className="mt-2 cursor-pointer transition-colors"
        />

        <div className="flex items-center justify-between gap-4 flex-wrap mt-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Showing <span className="text-slate-900 dark:text-slate-100">{filteredRows.length}</span> results.
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
            >
              Export CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

