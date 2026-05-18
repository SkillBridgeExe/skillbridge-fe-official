import { useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminDataTable from "@/components/admin/AdminDataTable";
import { ACTIVITY_LOGS } from "@/lib/mock-data/admin";
import { Clock, ShieldAlert, Bug, KeyRound } from "lucide-react";

type LogRow = (typeof ACTIVITY_LOGS)[number];

function severityForType(type: LogRow["type"]) {
  if (type === "report") return { label: "Warning", className: "bg-amber-50 border-amber-100 text-amber-700" };
  if (type === "payment") return { label: "Info", className: "bg-blue-50 border-blue-100 text-blue-700" };
  if (type === "system") return { label: "Info", className: "bg-blue-50 border-blue-100 text-blue-700" };
  if (type === "user") return { label: "Info", className: "bg-blue-50 border-blue-100 text-blue-700" };
  return { label: "Info", className: "bg-blue-50 border-blue-100 text-blue-700" };
}

export default function AdminSystemAdministration() {
  const [security2FA, setSecurity2FA] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);

  const [apiBaseUrl, setApiBaseUrl] = useState("https://api.skillbridge.vn");
  const [featureDetectSpam, setFeatureDetectSpam] = useState(true);
  const [featureAnomalyLogin, setFeatureAnomalyLogin] = useState(true);

  const [logFilter, setLogFilter] = useState<string>("all");

  const rows = useMemo(() => {
    return ACTIVITY_LOGS.map((l) => l);
  }, []);

  const filtered = useMemo(() => {
    if (logFilter === "all") return rows;
    return rows.filter((r) => r.type === logFilter);
  }, [rows, logFilter]);

  const logColumns = useMemo(() => {
    return [
      {
        key: "user",
        header: "User / System",
        cell: (r: LogRow) => <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{r.user}</div>,
      },
      {
        key: "action",
        header: "Action",
        cell: (r: LogRow) => <div className="text-sm text-slate-700">{r.action}</div>,
      },
      {
        key: "type",
        header: "Type",
        widthClassName: "w-36",
        cell: (r: LogRow) => {
          const s = severityForType(r.type);
          return (
            <div className={`inline-flex items-center px-3 py-1 rounded-full border text-[11px] font-bold gap-2 ${s.className}`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              {s.label}
            </div>
          );
        },
      },
      {
        key: "timestamp",
        header: "Timestamp",
        widthClassName: "w-36",
        cell: (r: LogRow) => (
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            {r.timestamp}
          </div>
        ),
      },
    ];
  }, []);

  return (
    <div className="space-y-6 pb-10">
      <div>
        <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-poppins">System Administration</div>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Security controls, configuration toggles, and audit logs (mock).
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-700/70 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-primary" />
              <div>
                <div className="text-sm font-black text-slate-900 dark:text-slate-100">Security</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">2FA, session timeout, login alerts.</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">2FA</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Require 2-factor authentication.</div>
                </div>
                <Switch
                  checked={security2FA}
                  onCheckedChange={(v) => {
                    setSecurity2FA(v);
                    toast({ title: "✅ 2FA updated", description: `2FA=${v} (mock)` });
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Session timeout</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Auto logout after inactivity.</div>
                </div>
                <Switch
                  checked={sessionTimeout}
                  onCheckedChange={(v) => {
                    setSessionTimeout(v);
                    toast({ title: "✅ Session timeout updated", description: `timeout=${v} (mock)` });
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Login alert</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Notify when new devices log in.</div>
                </div>
                <Switch
                  checked={loginAlerts}
                  onCheckedChange={(v) => {
                    setLoginAlerts(v);
                    toast({ title: "✅ Login alerts updated", description: `alerts=${v} (mock)` });
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-700/70 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Bug className="w-5 h-5 text-primary" />
              <div>
                <div className="text-sm font-black text-slate-900 dark:text-slate-100">Config</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">API config and feature toggles.</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">API base URL</div>
                <Input
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Detect spam</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enable spam detection pipeline.</div>
                </div>
                <Switch
                  checked={featureDetectSpam}
                  onCheckedChange={(v) => {
                    setFeatureDetectSpam(v);
                    toast({ title: "✅ Feature updated", description: `Detect spam=${v} (mock)` });
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Anomaly login</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Detect abnormal login behavior.</div>
                </div>
                <Switch
                  checked={featureAnomalyLogin}
                  onCheckedChange={(v) => {
                    setFeatureAnomalyLogin(v);
                    toast({ title: "✅ Feature updated", description: `Anomaly login=${v} (mock)` });
                  }}
                />
              </div>
            </div>
            <Button
              type="button"
              className="rounded-xl w-full"
              onClick={() => toast({ title: "✅ Config saved", description: "Settings persisted (mock)." })}
            >
              Save config
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">Logs</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Audit trail of user actions and system events (mock).</div>
          </div>
          <div className="w-full sm:w-56">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Filter</div>
            <SelectFilter
              value={logFilter}
              onChange={(v) => setLogFilter(v)}
              options={[
                { value: "all", label: "All logs" },
                { value: "user", label: "User" },
                { value: "course", label: "Course" },
                { value: "payment", label: "Payment" },
                { value: "system", label: "System" },
                { value: "report", label: "Report" },
              ]}
            />
          </div>
        </div>

        <AdminDataTable<LogRow> columns={logColumns} rows={filtered} loading={false} rowKey={(r) => r.id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-700/70 shadow-sm">
          <CardContent className="p-5">
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">Monitoring</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Realtime detection summary (mock).</div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <Bug className="w-5 h-5 text-amber-500" />
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Detect spam</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Last scan: 2 min ago</div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-amber-50 text-amber-700 text-[11px] font-bold">
                  Warning · {featureDetectSpam ? "Enabled" : "Disabled"}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Detect login anomaly</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Last alert: 45 min ago</div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-blue-50 text-blue-700 text-[11px] font-bold">
                  Info · {featureAnomalyLogin ? "Enabled" : "Disabled"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-700/70 shadow-sm">
          <CardContent className="p-5">
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">Quick actions</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Perform common admin tasks (mock).</div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => toast({ title: "✅ Login alerts sent", description: "Notification broadcast (mock)." })}
              >
                Send login alert
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => toast({ title: "✅ Database backup started", description: "Backup job queued (mock)." })}
              >
                Run backup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SelectFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="rounded-xl">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

