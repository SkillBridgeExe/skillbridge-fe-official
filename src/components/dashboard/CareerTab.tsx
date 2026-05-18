import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  CheckCircle2,
  TrendingUp,
  ExternalLink,
  Lock,
  Building
} from "lucide-react";
import { MOCK_JOB_MATCHES, MOCK_APPLICATIONS } from "@/lib/mock-data/dashboard";

export default function CareerTab() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ═══ Header Section ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Salary Insights */}
        <Card className="glass border-white/50 shadow-sm bg-gradient-to-r from-emerald-500/5 to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Market Value Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-black text-slate-900">$115k</span>
              <span className="text-base font-medium text-slate-500 mb-1">/ year avg</span>
            </div>
            <p className="text-sm text-slate-600">
              Based on your 72% Skill Match for <strong>Senior Frontend Engineer</strong> roles.
            </p>
            <div className="mt-4 flex gap-2">
              <Badge variant="outline" className="bg-white/50 border-emerald-200 text-emerald-700">High Demand</Badge>
              <Badge variant="outline" className="bg-white/50 border-blue-200 text-blue-700">Remote Friendly</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Application Status (Kanban summary) */}
        <Card className="glass border-white/50 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              Recent Applications
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs font-semibold text-slate-500 hover:text-primary">
              View All Tracker
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
               {MOCK_APPLICATIONS.map((app) => (
                 <div key={app.id} className="p-3 bg-white rounded-xl border border-slate-100 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-base text-slate-900 leading-tight">{app.role}</h4>
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-1",
                        app.status === "interview" ? "bg-amber-400" :
                        app.status === "applied" ? "bg-blue-400" : "bg-red-400"
                      )} />
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Building className="w-3.5 h-3.5" /> {app.company}
                    </div>
                    <div className="mt-auto pt-2 border-t border-slate-50 flex justify-between items-center text-xs font-semibold text-slate-400 uppercase">
                      <span>{app.status}</span>
                      <span>{new Date(app.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                 </div>
               ))}
             </div>
          </CardContent>
        </Card>

      </div>

      {/* ═══ Top Match Highlight ═══ */}
      {MOCK_JOB_MATCHES.length > 0 && (
        <div className="bg-gradient-to-r from-primary/5 via-white to-emerald-500/5 rounded-2xl border border-primary/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={MOCK_JOB_MATCHES[0].logo} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-100" />
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wider">🔥 Top AI Match</p>
              <h4 className="text-base font-bold text-slate-900">{MOCK_JOB_MATCHES[0].role} at {MOCK_JOB_MATCHES[0].company}</h4>
              <p className="text-sm text-slate-500">{MOCK_JOB_MATCHES[0].location} • {MOCK_JOB_MATCHES[0].salary}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-emerald-500">{MOCK_JOB_MATCHES[0].matchScore}%</span>
            <Button size="sm" className="bg-primary text-white hover:bg-primary/90 rounded-xl text-xs font-bold shadow-sm shadow-primary/20">
              View Details <ExternalLink className="w-3 h-3 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══ Job Matches ═══ */}
      <Card className="glass border-white/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900">Recommended Jobs</CardTitle>
          <p className="text-base text-slate-500">AI-matched opportunities based on your completed lessons.</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {MOCK_JOB_MATCHES.map((job) => (
              <div key={job.id} className="flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:border-primary/20 transition-all group">
                {/* Logo & Match Score */}
                <div className="flex items-center md:flex-col justify-between md:justify-start gap-4 md:w-32 flex-shrink-0">
                   <img src={job.logo} alt={job.company} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
                   <div className="flex flex-col items-end md:items-center">
                     <span className={cn(
                       "text-xl font-black",
                       job.matchScore >= 90 ? "text-emerald-500" : job.matchScore >= 80 ? "text-blue-500" : "text-amber-500"
                     )}>{job.matchScore}%</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase">Match</span>
                   </div>
                </div>

                {/* Job Info */}
                <div className="flex-1 flex flex-col justify-center">
                   <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">{job.role}</h3>
                   <div className="flex flex-wrap items-center gap-3 mt-1 text-sm font-medium text-slate-500">
                      <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> {job.company}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                      <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> {job.salary}</span>
                   </div>
                   
                   <div className="flex flex-wrap items-center gap-2 mt-3">
                     {job.tags.map(tag => (
                       <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">{tag}</Badge>
                     ))}
                   </div>
                </div>

                {/* Actions & Missing Skills */}
                <div className="flex flex-col justify-center items-end gap-3 md:w-48 flex-shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                   {job.missingSkills.length > 0 ? (
                     <div className="text-right w-full">
                       <p className="text-[11px] font-bold text-slate-500 uppercase mb-1 flex justify-end items-center gap-1">
                          <Lock className="w-3 h-3" /> Skill Gap
                       </p>
                       <div className="flex flex-col gap-1 items-end">
                         {job.missingSkills.map(skill => (
                           <span key={skill} className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-md font-medium inline-block">{skill}</span>
                         ))}
                       </div>
                     </div>
                   ) : (
                     <div className="text-right w-full">
                       <p className="text-[11px] font-bold text-emerald-600 uppercase mb-1 flex justify-end items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Perfect Match
                       </p>
                     </div>
                   )}
                   <Button size="sm" className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors mt-auto">
                     Apply Now <ExternalLink className="w-3 h-3 ml-1.5" />
                   </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
