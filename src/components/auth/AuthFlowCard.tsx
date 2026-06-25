import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function AuthFlowCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-blue-50 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-8 shadow-xl shadow-blue-950/5">
        <Link
          to="/"
          className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-sky-600"
        >
          <ArrowLeft className="h-4 w-4" />
          SkillBridge
        </Link>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
          {icon}
        </div>
        <h1 className="mt-6 text-2xl font-black tracking-tight text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        {children ? <div className="mt-7">{children}</div> : null}
      </section>
    </main>
  );
}
