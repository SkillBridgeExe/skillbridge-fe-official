import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Ban, CheckCircle2, Eye, RefreshCw, Search, ShieldAlert, UserCheck, UserCog, Users } from "lucide-react";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminIconActionButton from "@/components/admin/AdminIconActionButton";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUERY_KEYS } from "@/constants/app";
import { getApiErrorMessage } from "@/lib/api-error";
import { useToast } from "@/hooks/use-toast";
import {
  getAdminUserSummary,
  getAdminUsers,
  replaceAdminUserRoles,
  updateAdminUserStatus,
  type AdminUserListItem,
  type AdminUserRole,
  type AdminUserStatus,
  type AdminUsersQuery,
} from "@/services/admin-users.service";

const ROLE_OPTIONS: Array<{ value: AdminUserRole; label: string }> = [
  { value: "USER", label: "User" },
  { value: "MENTOR", label: "Mentor" },
  { value: "BUSINESS", label: "Business" },
  { value: "ADMIN", label: "Admin" },
];

const STATUS_OPTIONS: Array<{ value: AdminUserStatus; label: string }> = [
  { value: "ACTIVE", label: "Active" },
  { value: "UNVERIFIED", label: "Unverified" },
  { value: "SUSPENDED", label: "Suspended" },
];

function normalizeRole(value: string | null): AdminUserRole | undefined {
  const normalized = value?.toUpperCase();
  return ROLE_OPTIONS.some((role) => role.value === normalized) ? (normalized as AdminUserRole) : undefined;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function initials(user: AdminUserListItem) {
  const source = user.displayName || user.email;
  return source.slice(0, 2).toUpperCase();
}

export default function AdminUserManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AdminUserRole | undefined>(() =>
    normalizeRole(searchParams.get("role")),
  );
  const [statusFilter, setStatusFilter] = useState<AdminUserStatus | undefined>();
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [roleDialogUser, setRoleDialogUser] = useState<AdminUserListItem | null>(null);
  const [roleDraft, setRoleDraft] = useState<AdminUserRole[]>([]);
  const [statusTarget, setStatusTarget] = useState<{
    user: AdminUserListItem;
    status: "ACTIVE" | "SUSPENDED";
  } | null>(null);

  useEffect(() => {
    setRoleFilter(normalizeRole(searchParams.get("role")));
    setPage(1);
  }, [searchParams]);

  const query = useMemo<AdminUsersQuery>(
    () => ({
      page,
      limit: 20,
      search: search.trim() || undefined,
      role: roleFilter,
      status: statusFilter,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
    }),
    [createdFrom, createdTo, page, roleFilter, search, statusFilter],
  );

  const usersQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_USERS(query),
    queryFn: () => getAdminUsers(query),
  });

  const summaryQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_USER_SUMMARY({ rangeDays: 30 }),
    queryFn: () => getAdminUserSummary({ rangeDays: 30 }),
  });

  const invalidateAdminUsers = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  const roleMutation = useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: AdminUserRole[] }) =>
      replaceAdminUserRoles(id, { roles }),
    onSuccess: async () => {
      setRoleDialogUser(null);
      await invalidateAdminUsers();
      toast({ title: "Roles updated" });
    },
    onError: (error) =>
      toast({
        title: "Unable to update roles",
        description: getApiErrorMessage(error),
        variant: "destructive",
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" }) =>
      updateAdminUserStatus(id, { status }),
    onSuccess: async () => {
      setStatusTarget(null);
      await invalidateAdminUsers();
      toast({ title: "User status updated" });
    },
    onError: (error) =>
      toast({
        title: "Unable to update status",
        description: getApiErrorMessage(error),
        variant: "destructive",
      }),
  });

  const rows = usersQuery.data?.items ?? [];
  const total = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (usersQuery.data?.limit ?? 20)));
  const totals = summaryQuery.data?.totals;

  const openRoleDialog = (user: AdminUserListItem) => {
    setRoleDialogUser(user);
    setRoleDraft(user.roles.length ? user.roles : ["USER"]);
  };

  const toggleRole = (role: AdminUserRole, checked: boolean) => {
    setRoleDraft((current) =>
      checked ? [...new Set([...current, role])] : current.filter((item) => item !== role),
    );
  };

  const setRoleUrlFilter = (value: string) => {
    const role = value === "all" ? undefined : (value as AdminUserRole);
    setRoleFilter(role);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (role) next.set("role", role);
    else next.delete("role");
    setSearchParams(next);
  };

  const columns = [
    {
      key: "user",
      header: "User",
      widthClassName: "w-[230px]",
      cell: (row: AdminUserListItem) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-10">
            <AvatarImage src={row.avatarUrl ?? undefined} />
            <AvatarFallback>{initials(row)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
              {row.displayName || "No display name"}
            </div>
            <div className="truncate text-xs text-muted-foreground">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      widthClassName: "w-[110px]",
      cell: (row: AdminUserListItem) => (
        <div className="flex max-w-[100px] flex-wrap gap-1.5">
          {row.roles.map((role) => (
            <Badge key={role} variant="outline" className="whitespace-nowrap">
              {role}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      widthClassName: "w-[115px]",
      cell: (row: AdminUserListItem) => <AdminStatusBadge status={row.status} />,
    },
    {
      key: "verified",
      header: "Verified",
      widthClassName: "w-[80px]",
      cell: (row: AdminUserListItem) => (
        <span className="text-sm font-semibold text-foreground">
          {row.isEmailVerified ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      widthClassName: "w-[115px]",
      cell: (row: AdminUserListItem) => (
        <div className="text-sm font-semibold text-foreground">
          {formatDate(row.createdAt)}
        </div>
      ),
    },
    {
      key: "lastLogin",
      header: "Last login",
      widthClassName: "w-[135px]",
      headerClassName: "hidden 2xl:table-cell",
      cellClassName: "hidden 2xl:table-cell",
      cell: (row: AdminUserListItem) => (
        <div className="text-sm font-medium text-muted-foreground">{formatDate(row.lastLoginAt)}</div>
      ),
    },
    {
      key: "metrics",
      header: "Metrics",
      widthClassName: "w-[190px]",
      cell: (row: AdminUserListItem) => (
        <div className="min-w-0 text-xs font-semibold text-foreground">
          <span>{row.cvCount} CVs</span>
          <span className="px-1.5 text-muted-foreground">/</span>
          <span>{row.matchCount} matches</span>
          <span className="px-1.5 text-muted-foreground">/</span>
          <span>{row.interviewCount} interviews</span>
          <div className="mt-1 font-mono text-muted-foreground">{formatVnd(row.paidAmountVnd)}</div>
        </div>
      ),
    },
    {
      key: "plans",
      header: "Plans",
      widthClassName: "w-[150px]",
      headerClassName: "hidden 2xl:table-cell",
      cellClassName: "hidden 2xl:table-cell",
      cell: (row: AdminUserListItem) => (
        <div className="max-w-[130px] truncate text-sm font-semibold text-foreground">
          {row.activePlanCodes.length ? row.activePlanCodes.join(", ") : "None"}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      widthClassName: "w-[132px]",
      headerClassName: "text-center",
      cell: (row: AdminUserListItem) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(event) => event.stopPropagation()}>
          <AdminIconActionButton
            label="View profile"
            variant="outline"
            onClick={() => navigate(`/admin/users/${row.id}`)}
          >
            <Eye data-icon="inline-start" />
          </AdminIconActionButton>
          <AdminIconActionButton label="Edit roles" variant="outline" onClick={() => openRoleDialog(row)}>
            <UserCog data-icon="inline-start" />
          </AdminIconActionButton>
          <AdminIconActionButton
            label={row.status === "SUSPENDED" ? "Reactivate user" : "Suspend user"}
            variant={row.status === "SUSPENDED" ? "default" : "destructive"}
            onClick={() =>
              setStatusTarget({
                user: row,
                status: row.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
              })
            }
          >
            {row.status === "SUSPENDED" ? (
              <RefreshCw data-icon="inline-start" />
            ) : (
              <Ban data-icon="inline-start" />
            )}
          </AdminIconActionButton>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-primary">Admin users</p>
          <h1 className="text-3xl font-bold tracking-normal text-foreground">User Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search, audit, suspend, reactivate, and update roles through the live admin API.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total users" value={totals?.totalUsers ?? total} icon={Users} />
        <MetricCard title="Active" value={totals?.activeUsers ?? 0} icon={UserCheck} />
        <MetricCard title="Unverified" value={totals?.unverifiedUsers ?? 0} icon={CheckCircle2} />
        <MetricCard title="Suspended" value={totals?.suspendedUsers ?? 0} icon={ShieldAlert} />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px_180px]">
            <AdminFilterBar
              icon={Search}
              placeholder="Search name or email..."
              searchValue={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              onReset={() => {
                setSearch("");
                setStatusFilter(undefined);
                setCreatedFrom("");
                setCreatedTo("");
                setRoleUrlFilter("all");
              }}
            />
            <FilterSelect label="Role" value={roleFilter ?? "all"} onChange={setRoleUrlFilter}>
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Status"
              value={statusFilter ?? "all"}
              onChange={(value) => {
                setStatusFilter(value === "all" ? undefined : (value as AdminUserStatus));
                setPage(1);
              }}
            >
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </FilterSelect>
            <DateField label="Created from" value={createdFrom} onChange={setCreatedFrom} />
            <DateField label="Created to" value={createdTo} onChange={setCreatedTo} />
          </div>

          <AdminDataTable<AdminUserListItem>
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            loading={usersQuery.isLoading}
            minWidthClassName="min-w-[990px] 2xl:min-w-[1270px]"
            emptyTitle="No users found"
            emptyDescription="Try changing the search, role, status, or created date filters."
            onRowClick={(row) => navigate(`/admin/users/${row.id}`)}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-muted-foreground">
              Page {page} of {totalPages}. Showing {rows.length} of {total} users.
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={page <= 1 || usersQuery.isFetching}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages || usersQuery.isFetching}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(roleDialogUser)} onOpenChange={(open) => !open && setRoleDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update roles</DialogTitle>
            <DialogDescription>
              Replace roles for {roleDialogUser?.email}. At least one role is required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {ROLE_OPTIONS.map((role) => (
              <label
                key={role.value}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-semibold"
              >
                <Checkbox
                  checked={roleDraft.includes(role.value)}
                  onCheckedChange={(checked) => toggleRole(role.value, checked === true)}
                />
                {role.label}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogUser(null)}>
              Cancel
            </Button>
            <Button
              disabled={!roleDialogUser || roleDraft.length === 0 || roleMutation.isPending}
              onClick={() =>
                roleDialogUser && roleMutation.mutate({ id: roleDialogUser.id, roles: roleDraft })
              }
            >
              Save roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(statusTarget)} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget?.status === "SUSPENDED" ? "Suspend user?" : "Reactivate user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget?.status === "SUSPENDED"
                ? "Suspending this account disables access and revokes active refresh sessions."
                : "Reactivating this account restores access to protected routes."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!statusTarget || statusMutation.isPending}
              onClick={() =>
                statusTarget &&
                statusMutation.mutate({ id: statusTarget.user.id, status: statusTarget.status })
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: ElementType;
}) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <div className="text-sm font-semibold text-muted-foreground">{title}</div>
          <div className="mt-1 font-mono text-3xl font-bold tracking-normal text-foreground tabular-nums">
            {value.toLocaleString()}
          </div>
        </div>
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-5">
          <Icon />
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>{children}</SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{label}</Label>
      <Input className="mt-1" type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
