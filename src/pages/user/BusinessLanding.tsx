import { Link } from "react-router-dom";
import { Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BusinessLanding() {
  return (
    <div className="min-h-dvh bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-xl text-center bg-white border border-slate-200 rounded-2xl p-10 shadow-sm">
        <div className="w-14 h-14 mx-auto rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5">
          <Building2 className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-poppins font-black text-slate-900 mb-3">SkillBridge for Business</h1>
        <p className="text-slate-600 mb-6 leading-relaxed">
          This page is being refreshed. The full English business experience will be available shortly.
        </p>
        <Link to="/dashboard">
          <Button className="rounded-xl px-6">
            Back to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
