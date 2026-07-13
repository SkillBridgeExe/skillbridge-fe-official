import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { QUERY_KEYS } from "@/constants/app";
import { useHasApiSession } from "@/hooks/use-api-session";
import { getMySkills } from "@/services/user-profile.service";
import { groupDashboardSkills } from "./dashboard-view-model";

export default function SkillsTab() {
  const hasApiSession = useHasApiSession();
  const query = useQuery({
    queryKey: QUERY_KEYS.USER_SKILLS,
    queryFn: () => getMySkills(),
    enabled: hasApiSession,
    staleTime: 5 * 60_000,
  });
  const groups = groupDashboardSkills(query.data ?? []);

  if (query.isLoading)
    return (
      <Centered
        icon={<Loader2 className="h-6 w-6 animate-spin" />}
        text="Loading your skills"
      />
    );
  if (query.isError)
    return (
      <Centered
        icon={<AlertCircle className="h-6 w-6" />}
        text="Skills could not be loaded"
      />
    );
  if (!groups.length)
    return (
      <Centered
        icon={<Sparkles className="h-6 w-6" />}
        text="Add skills to your profile to see real category scores here"
      />
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <section
            key={group.category}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">{group.category}</h2>
              <span className="text-lg font-black text-primary">
                {group.averagePercent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${group.averagePercent}%` }}
              />
            </div>
          </section>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map((group) => (
          <section
            key={group.category}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="mb-4 font-bold text-slate-900">{group.category}</h3>
            <div className="space-y-4">
              {group.skills.map((skill) => (
                <div key={skill.id}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {skill.name}
                    </span>
                    <span className="text-slate-500">
                      Level {skill.level}/5
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      style={{ width: `${skill.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Historical skill growth is not shown because the API does not currently
        expose skill snapshots over time.
      </p>
    </div>
  );
}

function Centered({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
      {icon}
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}
