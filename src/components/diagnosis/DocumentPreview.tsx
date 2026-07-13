import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
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
  Wand2,
  Loader2,
} from "lucide-react";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { useTranslation } from "react-i18next";
import type { BulletFeedbackItem, CanonicalCvDocument } from "@shared/api";
import { useAiAppliedCv } from "@/hooks/use-ai-applied-cv";
import { Chapter } from "@/components/diagnosis/editorial";

/** Match a rendered bullet against the BE's bullet_feedback ARRAY by its `text`.
 *  Exact (whitespace-insensitive) match wins; else a containment match on
 *  reasonably-long text (>10 chars) absorbs trims/ellipses either side. */
export function findBulletFeedback(
  bullet: string,
  feedback: BulletFeedbackItem[] | undefined,
): BulletFeedbackItem | null {
  if (!feedback?.length) return null;
  const norm = (value: string) => value.toLowerCase().replace(/\s+/g, "");
  const normBullet = norm(bullet);
  if (!normBullet) return null;
  return (
    feedback.find((fb) => norm(fb.text ?? "") === normBullet) ??
    feedback.find((fb) => {
      const normText = norm(fb.text ?? "");
      return normText.length > 10 && (normBullet.includes(normText) || normText.includes(normBullet));
    }) ??
    null
  );
}

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

import { seedBuilderFromDocument } from "./edit-in-builder";

export function DocumentPreview({ hideEditOriginal = false }: { hideEditOriginal?: boolean }) {
  const { t } = useTranslation("diagnosis");
  const reviewData = useDiagnosisStore((s) => s.reviewData);
  const highlightEvidence = useDiagnosisStore((s) => s.highlightEvidence);
  const cvId = useDiagnosisStore((s) => s.lastCvId);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<"parsed" | "ai">("parsed");

  const baseDoc: CanonicalCvDocument | null = React.useMemo(() => {
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

  const matchId = reviewData?.jdMatch?.matchId || null;
  const aiCv = useAiAppliedCv(cvId, matchId, baseDoc);

  const doc = viewMode === "ai" && aiCv.appliedDocument ? aiCv.appliedDocument : baseDoc;
  const isReal = !!doc;

  const handleEdit = (useAi: boolean) =>
    seedBuilderFromDocument(useAi && aiCv.appliedDocument ? aiCv.appliedDocument : baseDoc);

  const renderBullet = (bullet: string) => {
    const isChanged = viewMode === "ai" && aiCv.changedBullets.includes(bullet);

    const feedback = findBulletFeedback(bullet, reviewData?.bullet_feedback);
    const hasQuantifiedIssue = feedback && feedback.quantified === false;

    const content = (
      <>
        {isChanged ? (
          <mark className="bg-[#DCE9D7] text-[#346538] rounded px-0.5 font-medium transition-colors">
            {bullet}
          </mark>
        ) : hasQuantifiedIssue ? (
          <mark className="bg-[#FBF3DB] text-[#956400] rounded px-0.5 font-medium transition-colors">
            {bullet}
          </mark>
        ) : (
          renderHighlightedText(bullet, highlightEvidence)
        )}
      </>
    );

    if (feedback) {
      const showMissingQuantified = feedback.quantified === false;
      const showWeakOpener = feedback.weakOpener === true || feedback.verbFirst === false;
      const showFirstPerson = feedback.firstPerson === true;

      const hasAnyFlag = showMissingQuantified || showWeakOpener || showFirstPerson;

      if (!hasAnyFlag) return content;

      return (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="relative cursor-help group inline-block">
                {content}
                <span className="inline-flex ml-1.5 gap-1 align-middle opacity-80 group-hover:opacity-100 transition-opacity">
                   {showMissingQuantified && (
                     <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-amber-200 text-amber-700 bg-amber-50 font-medium">
                       {t("bulletFeedback.missingQuantification")}
                     </Badge>
                   )}
                   {showWeakOpener && (
                     <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-blue-200 text-blue-700 bg-blue-50 font-medium">
                       {t("bulletFeedback.weakOpener")}
                     </Badge>
                   )}
                   {showFirstPerson && (
                     <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-purple-200 text-purple-700 bg-purple-50 font-medium">
                       {t("bulletFeedback.firstPerson")}
                     </Badge>
                   )}
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px] p-3 text-sm bg-slate-900 text-white shadow-xl border-none">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4 border-b border-slate-700 pb-2 mb-2">
                  <span className="font-medium text-slate-200">{t("bulletFeedback.title")}</span>
                </div>
                <div className="text-slate-300 text-[13px] leading-relaxed">
                  <ul className="list-disc pl-4 space-y-1">
                    {feedback.tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;
  };

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
    <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
      {/* Editorial Header */}
      <div className="flex items-start justify-between">
        <Chapter title={t("preview.title")} kicker="CV PREVIEW" />
        {isReal && (
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 mt-1 ${
            viewMode === "ai" ? "text-ink-accent bg-ink-accent/10" : "text-slate-500 bg-slate-100"
          }`}>
            {viewMode === "ai" ? <Wand2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
            {viewMode === "ai" ? t("preview.aiApplied") : t("preview.original")}
          </span>
        )}
      </div>

      {/* View Toggle / Note */}
      {isReal && (
        <div className="bg-white border border-[#EAEAEA] rounded-xl shadow-sm p-3 flex flex-col gap-3">
          {matchId ? (
            <>
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("parsed")}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                    viewMode === "parsed"
                      ? "bg-white text-slate-800 shadow"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t("preview.tabOriginal")}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("ai")}
                  disabled={aiCv.isFetching}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    viewMode === "ai"
                      ? "bg-ink-accent text-white shadow"
                      : "text-slate-500 hover:text-slate-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {aiCv.isFetching && <Loader2 className="w-3 h-3 animate-spin" />}
                  {t("preview.tabAi")}
                </button>
              </div>

              {viewMode === "ai" && !aiCv.isFetching && (
                <div className="text-xs text-slate-600 px-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 text-ink-accent font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t("preview.appliedCount", { count: aiCv.appliedCount, total: aiCv.totalEligible })}
                    </div>
                    <button
                      onClick={() => handleEdit(true)}
                      className="px-3 py-1.5 bg-primary text-white rounded-md font-bold hover:bg-primary/90 transition-colors"
                    >
                      {t("preview.editApplied")}
                    </button>
                  </div>
                  {aiCv.manualTasks.length > 0 && (
                    <div className="bg-amber-50 text-amber-800 p-2 rounded border border-amber-100/50 mt-1">
                      <p className="font-semibold mb-1 text-[11px] uppercase tracking-wider">{t("preview.manualTasks")}</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {aiCv.manualTasks.map((task, i) => (
                          <li key={i}>{task.display_name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {viewMode === "parsed" && !hideEditOriginal && (
                <div className="flex justify-end px-1">
                  <button
                    onClick={() => handleEdit(false)}
                    className="px-3 py-1.5 bg-primary text-white rounded-md font-bold text-xs hover:bg-primary/90 transition-colors"
                  >
                    {t("preview.editOriginal")}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-slate-500 px-1 py-0.5 flex flex-col items-center gap-2">
              <p>{t("preview.addJdNote")}</p>
              {!hideEditOriginal && (
                <button
                  onClick={() => handleEdit(false)}
                  className="px-3 py-1.5 bg-primary text-white rounded-md font-bold hover:bg-primary/90 transition-colors"
                >
                  {t("preview.editOriginal")}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <Card className="bg-white border border-[#EAEAEA] shadow-sm overflow-hidden flex flex-col relative">
        {viewMode === "ai" && aiCv.isFetching && (
          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
             <Loader2 className="w-6 h-6 animate-spin text-ink-accent" />
          </div>
        )}
        <CardContent ref={scrollContainerRef} className="p-0 flex-1 overflow-y-auto scrollbar-none bg-slate-50 relative" style={{ maxHeight: "calc(100dvh - 16rem)" }}>
          <div className="p-4 sm:p-6 pb-12" ref={containerRef}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-sm">
              {!isReal || !doc ? (
                /* ── No data yet ── */
                <div className="p-8 text-center text-slate-400">
                  <User className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-semibold text-slate-500">{t("preview.noCvData")}</p>
                  <p className="text-xs mt-1">{t("preview.empty")}</p>
                </div>
              ) : (
                <>
                  {/* Header — Name + Contact */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">
                      {doc.contact.name || (
                        <span className="text-slate-400 font-medium italic text-[14px]">{t("preview.unknownName")}</span>
                      )}
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
                        {renderBullet(doc.summary)}
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
                          <span>{t("preview.skills")}</span>
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
                            <div key={idx} id={`exp-${idx}`} className="space-y-1">
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
                                        {renderBullet(bullet)}
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
                                        {renderBullet(bullet)}
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
                                        {renderBullet(bullet)}
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
                                        {renderBullet(bullet)}
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
