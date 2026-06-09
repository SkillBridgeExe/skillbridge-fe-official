import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  LayoutTemplate,
  CheckCircle2,
  Mail,
  Phone,
  Code,
  FileText,
  User,
  Link2,
  Briefcase,
  FolderGit2,
  GraduationCap,
  Award,
  Activity,
} from "lucide-react";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useTranslation } from "react-i18next";
import type { CanonicalCvDocument } from "@shared/api";

const getSearchMatch = (text: string, search: string | null): string | null => {
  if (!search) return null;
  const cleanText = text.toLowerCase().trim();
  const cleanSearch = search.toLowerCase().trim();
  if (cleanText.includes(cleanSearch)) {
    const idx = cleanText.indexOf(cleanSearch);
    return text.substring(idx, idx + cleanSearch.length);
  }
  const minLen = Math.floor(cleanSearch.length * 0.6);
  if (minLen >= 4) {
    const partialSearch = cleanSearch.substring(0, minLen);
    if (cleanText.includes(partialSearch)) {
      const idx = cleanText.indexOf(partialSearch);
      return text.substring(idx, idx + partialSearch.length);
    }
  }
  return null;
};

const renderHighlightedText = (text: string, search: string | null) => {
  const match = getSearchMatch(text, search);
  if (!match) return text;
  const idx = text.toLowerCase().indexOf(match.toLowerCase());
  if (idx === -1) return text;
  const before = text.substring(0, idx);
  const matchedPart = text.substring(idx, idx + match.length);
  const after = text.substring(idx + match.length);
  return (
    <>
      {before}
      <mark className="bg-[#FBF3DB] text-[#956400] rounded px-0.5 font-medium">
        {matchedPart}
      </mark>
      {after}
    </>
  );
};

export function DocumentPreview() {
  const { t } = useTranslation("diagnosis");
  const reviewData = useDiagnosisStore((s) => s.reviewData);
  const highlightEvidence = useDiagnosisStore((s) => s.highlightEvidence);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const doc: CanonicalCvDocument | null = React.useMemo(() => {
    if (reviewData?.document) return reviewData.document;
    if (reviewData?.parsedCv) {
      const cv = reviewData.parsedCv;
      return {
        language: "en",
        contact: {
          name: cv.name || null,
          email: cv.email || null,
          phone: cv.phone || null,
          location: null,
          links: [],
        },
        summary: cv.summary || "",
        skills: {
          technical: cv.skills || [],
          soft: [],
          languages: [],
          tools: [],
        },
        education: [],
        experience: [],
        projects: [],
        certifications: [],
        activities: [],
      };
    }
    return null;
  }, [reviewData]);

  const isReal = !!doc;

  React.useEffect(() => {
    if (!highlightEvidence || !containerRef.current || !scrollContainerRef.current) return;

    const timer = setTimeout(() => {
      const markEl = containerRef.current?.querySelector("mark") as HTMLElement | null;
      const scrollContainer = scrollContainerRef.current;
      if (markEl && scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const markRect = markEl.getBoundingClientRect();
        
        const relativeTop = markRect.top - containerRect.top + scrollContainer.scrollTop;
        const targetScrollTop = relativeTop - containerRect.height / 2 + markRect.height / 2;
        
        scrollContainer.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth"
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [highlightEvidence]);

  return (
    <div className="lg:sticky lg:top-6 lg:self-start">
      <Card className="bg-white border border-[#EAEAEA] shadow-sm overflow-hidden flex flex-col">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
            <LayoutTemplate className="w-4 h-4" />
            {t("preview.title")}
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
            isReal ? "text-emerald-600 bg-emerald-100" : "text-amber-600 bg-amber-100"
          }`}>
            {isReal ? <CheckCircle2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
            {isReal ? t("preview.parsed") : t("preview.waiting")}
          </span>
        </CardHeader>
        <CardContent ref={scrollContainerRef} className="p-0 flex-1 overflow-y-auto scrollbar-none bg-slate-50 relative" style={{ maxHeight: "calc(100vh - 10rem)" }}>
          <div className="p-4 sm:p-6 pb-12" ref={containerRef}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-sm">
              {!isReal || !doc ? (
                /* ── No data yet ── */
                <div className="p-8 text-center text-slate-400">
                  <User className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-semibold text-slate-500">No CV data yet</p>
                  <p className="text-xs mt-1">{t("preview.empty")}</p>
                </div>
              ) : (
                <>
                  {/* Header — Name + Contact */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">
                      {doc.contact.name || "Unknown"}
                    </h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-slate-500 text-[13px]">
                      {doc.contact.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />{doc.contact.email}
                        </span>
                      )}
                      {doc.contact.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />{doc.contact.phone}
                        </span>
                      )}
                      {doc.contact.location && (
                        <span className="text-slate-400">{doc.contact.location}</span>
                      )}
                    </div>
                    {doc.contact.links && doc.contact.links.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-1 border-t border-slate-100/50">
                        {doc.contact.links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-indigo-600 transition-colors"
                          >
                            <Link2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{link.label || link.url}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-6">
                    {/* Summary */}
                    {doc.summary && (
                      <p className="text-slate-600 leading-relaxed" data-bullet={doc.summary}>
                        {renderHighlightedText(doc.summary, highlightEvidence)}
                      </p>
                    )}

                    {/* Skills (Technical & Soft & Tools & Languages) */}
                    {((doc.skills?.technical && doc.skills.technical.length > 0) ||
                      (doc.skills?.soft && doc.skills.soft.length > 0) ||
                      (doc.skills?.tools && doc.skills.tools.length > 0) ||
                      (doc.skills?.languages && doc.skills.languages.length > 0)) && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Code className="w-3.5 h-3.5" />
                          <span>Skills</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {doc.skills.technical?.map((skill) => (
                            <span key={skill} className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
                              {skill}
                            </span>
                          ))}
                          {doc.skills.tools?.map((skill) => (
                            <span key={skill} className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
                              {skill}
                            </span>
                          ))}
                          {doc.skills.soft?.map((skill) => (
                            <span key={skill} className="px-2 py-1 rounded text-xs font-medium bg-slate-50 text-slate-500 italic">
                              {skill}
                            </span>
                          ))}
                          {doc.skills.languages?.map((skill) => (
                            <span key={skill} className="px-2 py-1 rounded text-xs font-medium bg-slate-50 text-slate-500 italic">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Experience */}
                    {doc.experience && doc.experience.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>{t("preview.experience")}</span>
                        </div>
                        <div className="space-y-4">
                          {doc.experience.map((exp, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between items-start">
                                <div className="text-[13px] font-semibold text-slate-800">
                                  {exp.role} — {exp.org}
                                </div>
                                {(exp.start || exp.end) && (
                                  <div className="text-[11px] font-mono text-[#787774] text-right whitespace-nowrap ml-2">
                                    {exp.start || ""} – {exp.end || ""}
                                  </div>
                                )}
                              </div>
                              {exp.bullets && exp.bullets.length > 0 && (
                                <ul className="list-disc pl-4 space-y-1 text-[12px] text-slate-600">
                                  {exp.bullets.map((bullet, bIdx) => (
                                    <li key={bIdx} className="marker:text-[#B9B9B7]">
                                      <span data-bullet={bullet}>
                                        {renderHighlightedText(bullet, highlightEvidence)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects */}
                    {doc.projects && doc.projects.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <FolderGit2 className="w-3.5 h-3.5" />
                          <span>{t("preview.projects")}</span>
                        </div>
                        <div className="space-y-4">
                          {doc.projects.map((proj, idx) => (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex justify-between items-start">
                                <div className="text-[13px] font-semibold text-slate-800 flex flex-wrap items-center gap-1.5">
                                  <span>{proj.name}</span>
                                  {proj.role && (
                                    <span className="text-slate-400 font-normal">({proj.role})</span>
                                  )}
                                </div>
                                {proj.link && (
                                  <a href={proj.link} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-600">
                                    <Link2 className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              {proj.tech && proj.tech.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {proj.tech.map((tItem) => (
                                    <span key={tItem} className="px-1.5 py-0.5 rounded text-[11px] bg-[#F1F1EF] text-slate-600">
                                      {tItem}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {proj.bullets && proj.bullets.length > 0 && (
                                <ul className="list-disc pl-4 space-y-1 text-[12px] text-slate-600">
                                  {proj.bullets.map((bullet, bIdx) => (
                                    <li key={bIdx} className="marker:text-[#B9B9B7]">
                                      <span data-bullet={bullet}>
                                        {renderHighlightedText(bullet, highlightEvidence)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {doc.education && doc.education.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>{t("preview.education")}</span>
                        </div>
                        <div className="space-y-4">
                          {doc.education.map((edu, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between items-start">
                                <div className="text-[13px] font-semibold text-slate-800">
                                  {edu.school}
                                  {(edu.degree || edu.field) && (
                                    <span className="text-slate-500 font-normal">
                                      {" "}— {edu.degree || ""}{edu.degree && edu.field ? " in " : ""}{edu.field || ""}
                                    </span>
                                  )}
                                </div>
                                {(edu.start || edu.end) && (
                                  <div className="text-[11px] font-mono text-[#787774] text-right whitespace-nowrap ml-2">
                                    {edu.start || ""} – {edu.end || ""}
                                  </div>
                                )}
                              </div>
                              {edu.gpa && (
                                <div className="text-[11px] font-mono text-slate-500">
                                  GPA: {edu.gpa}
                                </div>
                              )}
                              {edu.highlights && edu.highlights.length > 0 && (
                                <ul className="list-disc pl-4 space-y-1 text-[12px] text-slate-600">
                                  {edu.highlights.map((bullet, bIdx) => (
                                    <li key={bIdx} className="marker:text-[#B9B9B7]">
                                      <span data-bullet={bullet}>
                                        {renderHighlightedText(bullet, highlightEvidence)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {doc.certifications && doc.certifications.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Award className="w-3.5 h-3.5" />
                          <span>{t("preview.certifications")}</span>
                        </div>
                        <div className="space-y-2">
                          {doc.certifications.map((cert, idx) => (
                            <div key={idx} className="flex justify-between text-[12px] text-slate-600">
                              <div>
                                <span className="font-medium text-slate-800">{cert.name}</span>
                                {cert.issuer && ` — ${cert.issuer}`}
                              </div>
                              {cert.date && (
                                <span className="font-mono text-[11px] text-[#787774] whitespace-nowrap ml-2">
                                  {cert.date}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Activities */}
                    {doc.activities && doc.activities.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5" />
                          <span>{t("preview.activities")}</span>
                        </div>
                        <div className="space-y-4">
                          {doc.activities.map((act, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between items-start">
                                <div className="text-[13px] font-semibold text-slate-800">
                                  {act.role ? `${act.role} — ` : ""}{act.org}
                                </div>
                                {((act as unknown as Record<string, string>).start || (act as unknown as Record<string, string>).end) && (
                                  <div className="text-[11px] font-mono text-[#787774] text-right whitespace-nowrap ml-2">
                                    {(act as unknown as Record<string, string>).start || ""} – {(act as unknown as Record<string, string>).end || ""}
                                  </div>
                                )}
                              </div>
                              {act.bullets && act.bullets.length > 0 && (
                                <ul className="list-disc pl-4 space-y-1 text-[12px] text-slate-600">
                                  {act.bullets.map((bullet, bIdx) => (
                                    <li key={bIdx} className="marker:text-[#B9B9B7]">
                                      <span data-bullet={bullet}>
                                        {renderHighlightedText(bullet, highlightEvidence)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
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
