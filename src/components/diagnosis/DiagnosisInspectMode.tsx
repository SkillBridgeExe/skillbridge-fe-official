import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowUpRight, CheckCircle2, ChevronRight, X, AlertCircle } from "lucide-react";
import type { GapItem } from "@shared/api";
import { DocumentPreview } from "./DocumentPreview";
import { TailorChecklist } from "./TailorChecklist";
import { Button } from "../ui/button";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";

interface DiagnosisInspectModeProps {
  issue: GapItem;
  matchId: string;
  cvId: string | null;
  onClose: () => void;
}

export function DiagnosisInspectMode({ issue, matchId, cvId, onClose }: DiagnosisInspectModeProps) {
  const { t } = useTranslation("diagnosis");
  const { setHighlightEvidence } = useDiagnosisStore();
  
  // Xử lý logic tô sáng CV (highlight)
  useEffect(() => {
    if (issue.canonical_name) {
      setHighlightEvidence(issue.canonical_name);
    }
    return () => {
      setHighlightEvidence(null);
    };
  }, [issue.canonical_name, setHighlightEvidence]);
  
  const severityLabel = 
    issue.severity >= 0.66 ? t("gapReport.severity.high") : 
    issue.severity >= 0.33 ? t("gapReport.severity.med") : 
    t("gapReport.severity.low");

  const severityColor = 
    issue.severity >= 0.66 ? "bg-[#9F2F2D] text-white" : 
    issue.severity >= 0.33 ? "bg-[#956400] text-white" : 
    "bg-[#787774] text-white";

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-[#FBFBFA] overflow-hidden animate-in slide-in-from-right duration-500">
      
      {/* ── Left Pane: CV Preview (60%) ── */}
      <div className="hidden md:flex flex-col w-[60%] border-r border-[#EAEAEA] bg-white h-full relative">
        <div className="flex items-center justify-between p-4 border-b border-[#EAEAEA] bg-white absolute top-0 w-full z-10 shadow-sm">
          <Button onClick={onClose} variant="ghost" size="sm" className="gap-2 text-[#787774] hover:text-[#2F3437]">
            <ArrowLeft className="w-4 h-4" /> {t("results.backToReview")}
          </Button>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#787774]">
            {t("results.inspectMode", { defaultValue: "Inspect Mode" })}
          </span>
        </div>
        <div className="flex-1 overflow-auto pt-16 bg-[#F7F6F3]">
          <DocumentPreview />
        </div>
      </div>

      {/* ── Right Pane: Inspector (40%) ── */}
      <div className="flex-1 md:w-[40%] flex flex-col h-full bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-20">
        
        {/* Mobile Header (Only visible on small screens) */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-[#EAEAEA]">
          <Button onClick={onClose} variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>

        {/* Inspector Content */}
        <div className="flex-1 overflow-auto p-6 space-y-8">
          
          {/* Issue Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", severityColor)}>
                {severityLabel}
              </span>
              <span className="px-2 py-0.5 rounded border border-[#EAEAEA] text-[10px] font-bold uppercase tracking-wider text-[#787774]">
                {t(`gapReport.type.${issue.type}`, { defaultValue: issue.type })}
              </span>
            </div>
            
            <h2 className="text-2xl font-bold text-[#2F3437] leading-tight">
              {issue.display_name}
            </h2>
            
            <p className="text-sm text-[#787774] leading-relaxed">
              {issue.recommended_next_action}
            </p>
          </div>

          {/* Detailed Context */}
          <div className="p-4 bg-[#FBFBFA] rounded-xl border border-[#EAEAEA] space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#787774]">
              {t("results.issueContext", { defaultValue: "Issue Context" })}
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] font-bold uppercase text-[#787774] mb-1">Status</span>
                <span className="text-sm font-semibold text-[#2F3437]">
                  {t(`gapReport.status.${issue.cv_status}`, { defaultValue: issue.cv_status })}
                </span>
              </div>
              
              <div>
                <span className="block text-[10px] font-bold uppercase text-[#787774] mb-1">Fixability</span>
                <span className="text-sm font-semibold text-[#2F3437]">
                  {t(`gapReport.fix.${issue.fixability}`, { defaultValue: issue.fixability })}
                </span>
              </div>
              
              {issue.cv_level !== null && issue.required_level !== null && (
                <div className="col-span-2">
                  <span className="block text-[10px] font-bold uppercase text-[#787774] mb-1">Level Gap</span>
                  <span className="text-sm font-semibold text-[#2F3437]">
                    CV: {issue.cv_level} / Required: {issue.required_level}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Area: Rewrite / Tailor */}
          {issue.fixability === "rewrite" && (
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink-accent">
                <AlertCircle className="w-4 h-4" /> 
                {t("results.fixWithAi", { defaultValue: "Fix with AI" })}
              </h4>
              {/* Reuse TailorChecklist as the fix UI container */}
              <div className="bg-white border-2 border-ink-accent/20 rounded-xl overflow-hidden shadow-sm">
                <TailorChecklist
                  matchId={matchId}
                  cvId={cvId}
                  document={undefined} // Pass undefined or real document if needed
                  // We might need to filter TailorChecklist to only show this specific issue
                  // For now, render it directly, or we can build a specific Rewrite Widget here
                />
              </div>
            </div>
          )}

          {/* Action Area: Learn / Build */}
          {(issue.fixability === "learn" || issue.fixability === "add_evidence") && (
            <div className="p-4 bg-ink-accent/5 rounded-xl border border-ink-accent/20 space-y-3">
              <h4 className="text-sm font-bold text-ink-accent">
                {t("results.needsEvidence", { defaultValue: "Need real evidence" })}
              </h4>
              <p className="text-xs text-[#2F3437] leading-relaxed">
                {t("results.needsEvidenceDesc", { defaultValue: "AI cannot invent this skill. You need to learn it or add real project evidence." })}
              </p>
              <Button className="w-full gap-2 mt-2" variant="default">
                {t("results.findResources", { defaultValue: "Find Learning Resources" })} <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
