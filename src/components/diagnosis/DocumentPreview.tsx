import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LayoutTemplate, CheckCircle2, Mail, Phone, Code, FileText, User } from "lucide-react";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";

export function DocumentPreview() {
  const reviewData = useDiagnosisStore((s) => s.reviewData);
  const cv = reviewData?.parsedCv;
  const isReal = !!cv;

  return (
    <div className="lg:sticky lg:top-6 lg:self-start">
      <Card className="glass border-white/50 shadow-sm overflow-hidden flex flex-col">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
            <LayoutTemplate className="w-4 h-4" />
            Document Preview
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
            isReal ? "text-emerald-600 bg-emerald-100" : "text-amber-600 bg-amber-100"
          }`}>
            {isReal ? <CheckCircle2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
            {isReal ? "AI Parsed" : "Waiting"}
          </span>
        </CardHeader>
        {/*
          Keep scrolling enabled with overflow-y-auto while hiding the scrollbar.
          Increase min height so full content remains visible.
        */}
        <CardContent className="p-0 flex-1 overflow-y-auto scrollbar-none bg-slate-50 relative" style={{ maxHeight: "calc(100vh - 10rem)" }}>
          <div className="p-4 sm:p-6 pb-12">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-sm">

              {!isReal ? (
                /* ── No data yet ── */
                <div className="p-8 text-center text-slate-400">
                  <User className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-semibold text-slate-500">No CV data yet</p>
                  <p className="text-xs mt-1">Upload and analyze a CV to see parsed information here.</p>
                </div>
              ) : (
                <>
                  {/* Header — Name + Contact */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">
                      {cv.name || "Unknown"}
                    </h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-slate-500 text-[13px]">
                      {cv.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />{cv.email}
                        </span>
                      )}
                      {cv.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />{cv.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-5">
                    {/* Summary */}
                    {cv.summary && (
                      <p className="text-slate-600 leading-relaxed">{cv.summary}</p>
                    )}

                    {/* Skills */}
                    {cv.skills && cv.skills.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                          <Code className="w-3.5 h-3.5" /> Skills
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cv.skills.map((skill) => (
                            <span key={skill} className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
