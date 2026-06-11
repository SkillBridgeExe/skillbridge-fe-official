import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { logout } from "@/services/auth.service";

export default function AdminSettings() {
  const navigate = useNavigate();

  const [systemName, setSystemName] = useState("SkillBridge Admin");
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh");
  const [language, setLanguage] = useState("vi");
  const [defaultRole, setDefaultRole] = useState("user");

  const [alertRevenue, setAlertRevenue] = useState(true);
  const [alertFunnel, setAlertFunnel] = useState(true);
  const [alertMentor, setAlertMentor] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);

  const save = () => {
    toast({
      title: "✅ Settings saved",
      description: "General & notification settings updated (mock).",
    });
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-poppins">Settings</div>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">System configuration and notifications (mock).</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-700/70 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">General</div>

            <div className="space-y-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">System name</div>
                <Input value={systemName} onChange={(e) => setSystemName(e.target.value)} className="rounded-xl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Timezone</div>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</SelectItem>
                      <SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Language</div>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vi">Vietnamese</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Default role</div>
                <Select value={defaultRole} onValueChange={setDefaultRole}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="mentor">Mentor</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="button" className="rounded-xl w-full" onClick={save}>
              Save general settings
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/70 dark:border-slate-700/70 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">Notification</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Revenue, funnel, mentor alerts (mock).</div>

            <div className="space-y-3">
              <ToggleRow
                title="Revenue alert"
                description="Notify when monthly revenue deviates from target."
                checked={alertRevenue}
                onChange={(v) => {
                  setAlertRevenue(v);
                  toast({ title: "✅ Updated", description: `Revenue alert=${v} (mock)` });
                }}
              />
              <ToggleRow
                title="Funnel alert"
                description="Notify when drop exceeds threshold."
                checked={alertFunnel}
                onChange={(v) => {
                  setAlertFunnel(v);
                  toast({ title: "✅ Updated", description: `Funnel alert=${v} (mock)` });
                }}
              />
              <ToggleRow
                title="Mentor alert"
                description="Notify when mentor ratings drop or improve."
                checked={alertMentor}
                onChange={(v) => {
                  setAlertMentor(v);
                  toast({ title: "✅ Updated", description: `Mentor alert=${v} (mock)` });
                }}
              />

              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Email notifications</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Receive alerts via email (mock).</div>
                </div>
                <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
              </div>
            </div>

            <Button type="button" className="rounded-xl w-full" onClick={save}>
              Save notification settings
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => {
            toast({ title: "✅ Signed out", description: "Local session cleared (mock)." });
            void logout();
            navigate("/?auth=login");
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700">
      <div>
        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

