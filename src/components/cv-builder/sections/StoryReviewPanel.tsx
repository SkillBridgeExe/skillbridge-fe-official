import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Award,
  Target,
  AlertCircle,
  Pencil,
  Check,
  Loader2,
} from "lucide-react";
import type {
  CareerTargetFromStoryResponse,
  StoryExtractedProject,
  StoryExtractedCertification,
  StoryExtractResponse,
  CanonicalCvDocument,
} from "@shared/api";
import { storyApplyPreview, mapStoreToCanonical } from "@/services/cv-builder.service";
import { updateBuilderDraftApi } from "@/api/cv/builder";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";

// ── Editable project (local state extends BE shape with selection + edits) ──

interface EditableProject extends StoryExtractedProject {
  selected: boolean;
  editingName: boolean;
  editingBullets: boolean;
}

interface EditableCert extends StoryExtractedCertification {
  selected: boolean;
  editingName: boolean;
}

interface StoryReviewPanelProps {
  draftId: string;
  /** Slice-1 result (career target). */
  careerTarget: CareerTargetFromStoryResponse;
  /** Slice-2 result (extracted projects + certifications). */
  extractResult: StoryExtractResponse;
  /** Called when apply is complete — parent can refresh/close. */
  onApplied: (appliedRoleCode?: string) => void;
}

export function StoryReviewPanel({
  draftId,
  careerTarget,
  extractResult,
  onApplied,
}: StoryReviewPanelProps) {
  const { t } = useTranslation("diagnosis");
  const { toast } = useToast();

  // ── Role selection ──
  const canSelectRole = !careerTarget.needs_user_input && !!careerTarget.role_code;
  const [roleSelected, setRoleSelected] = useState(canSelectRole);

  // ── Projects ──
  const [projects, setProjects] = useState<EditableProject[]>(() =>
    extractResult.projects.map((p) => ({
      ...p,
      selected: true,
      editingName: false,
      editingBullets: false,
    })),
  );

  // ── Certifications ──
  const [certs, setCerts] = useState<EditableCert[]>(() =>
    extractResult.certifications.map((c) => ({
      ...c,
      selected: true,
      editingName: false,
    })),
  );

  const [isApplying, setIsApplying] = useState(false);

  const store = useCvBuilderStore();

  // ── Helpers ──
  const toggleProject = (idx: number) =>
    setProjects((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, selected: !p.selected } : p)),
    );
  const toggleCert = (idx: number) =>
    setCerts((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c)),
    );

  const updateProject = (idx: number, patch: Partial<EditableProject>) =>
    setProjects((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    );
  const updateCert = (idx: number, patch: Partial<EditableCert>) =>
    setCerts((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    );

  const selectedCount =
    (roleSelected ? 1 : 0) +
    projects.filter((p) => p.selected).length +
    certs.filter((c) => c.selected).length;

  // ── Apply flow ──
  const handleApply = useCallback(async () => {
    if (selectedCount === 0) return;
    setIsApplying(true);

    try {
      const snapshot = useCvBuilderStore.getState();
      const currentDoc: CanonicalCvDocument = mapStoreToCanonical(snapshot);

      const selectedProjects = projects
        .filter((p) => p.selected)
        .map(({ selected: _s, editingName: _en, editingBullets: _eb, ...rest }) => ({
          ...rest,
          // Drop empty bullets (e.g. a trailing newline from the textarea) — never send blanks.
          bullets: rest.bullets.map((b) => b.trim()).filter((b) => b.length > 0),
        }));
      const selectedCerts = certs
        .filter((c) => c.selected)
        .map(({ selected: _s, editingName: _en, ...rest }) => rest);

      const result = await storyApplyPreview(draftId, {
        doc: currentDoc,
        selected: {
          role_code: roleSelected ? (careerTarget.role_code ?? undefined) : undefined,
          projects: selectedProjects,
          certifications: selectedCerts,
        },
      });

      // Skipped duplicates toast
      if (result.skipped_duplicates.length > 0) {
        toast({
          title: t("builder.storyReview.skippedTitle"),
          description: result.skipped_duplicates
            .map((item) => {
              const typeLabel = item.section === "projects"
                ? t("builder.entry.project")
                : t("builder.entry.certification", { defaultValue: "certification" });
              const nameWithSection = `${item.name} (${typeLabel.toLowerCase()})`;
              return t("builder.storyReview.skippedItem", { name: nameWithSection });
            })
            .join(", "),
          variant: "default",
        });
      }

      // Persist the merged doc FIRST — apply-preview does not persist. Doing the store mutation
      // only after this succeeds keeps apply atomic (a failed PUT leaves nothing half-applied).
      await updateBuilderDraftApi(draftId, {
        parsedJson: result.doc,
        targetRole: roleSelected ? (careerTarget.role_code ?? undefined) : undefined,
      });

      // Reflect the merged doc in the form, preserving the active draft session. preserveDraft
      // keeps draftId — nulling it (the default seed behavior) would break every draftId-gated
      // builder action (save/evaluate/rewrite/PDF) for the rest of the session.
      store.hydrateFromCanonical(result.doc, { preserveDraft: true });
      if (roleSelected && careerTarget.display_name) {
        store.setCareerTarget("targetPosition", careerTarget.display_name);
      }

      toast({
        title: t("builder.storyReview.appliedSuccess"),
        description: t("builder.storyReview.appliedDetail", {
          projects: result.applied.projects,
          certs: result.applied.certifications,
        }),
      });

      onApplied(roleSelected ? (careerTarget.role_code ?? undefined) : undefined);
    } catch {
      toast({
        title: t("builder.storyReview.applyError"),
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  }, [selectedCount, projects, certs, roleSelected, careerTarget, draftId, onApplied, toast, t, store]);

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
      <h3 className="text-sm font-bold text-slate-900">
        {t("builder.storyReview.panelTitle")}
      </h3>

      {/* ── Section 1: Career Target ── */}
      <div className="rounded-md border border-slate-100 p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Target className="h-4 w-4 text-primary" />
          {t("builder.storyReview.careerTitle")}
        </div>
        {canSelectRole && careerTarget.display_name ? (
          <div className="flex items-start gap-3">
            <Checkbox
              id="story-role"
              checked={roleSelected}
              onCheckedChange={() => setRoleSelected((v) => !v)}
              className="mt-0.5"
            />
            <label htmlFor="story-role" className="space-y-1 cursor-pointer">
              <p className="text-sm font-medium text-slate-900">
                {careerTarget.display_name}
              </p>
              <p className="text-xs text-slate-500">
                {t("builder.story.confidence", {
                  pct: Math.round((careerTarget.confidence ?? 0) * 100),
                })}
              </p>
              {careerTarget.matched_skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {careerTarget.matched_skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-[10px]">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </label>
          </div>
        ) : (
          <p className="text-xs text-amber-600 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            {t("builder.storyReview.roleCoaching")}
          </p>
        )}
      </div>

      {/* Honest degraded notice — some parts could not be extracted; never fabricated. */}
      {extractResult.degraded && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {t("builder.storyReview.degradedNotice")}
        </div>
      )}

      {/* ── Section 2: Projects ── */}
      <div className="rounded-md border border-slate-100 p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Briefcase className="h-4 w-4 text-primary" />
          {t("builder.storyReview.projectsTitle")}
          <span className="text-xs text-slate-400">({projects.length})</span>
        </div>
        {projects.length === 0 ? (
          <p className="text-xs text-slate-400">{t("builder.storyReview.noProjects")}</p>
        ) : (
          <div className="space-y-2">
            {projects.map((proj, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-md border p-3 transition-colors duration-150",
                  proj.selected
                    ? "border-primary/20 bg-primary/5"
                    : "border-slate-100 bg-slate-50/50 opacity-60",
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={proj.selected}
                    onCheckedChange={() => toggleProject(idx)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Name */}
                    <div className="flex items-center gap-2">
                      {proj.editingName ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            value={proj.name}
                            onChange={(e) =>
                              updateProject(idx, { name: e.target.value })
                            }
                            className="h-7 text-sm"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => updateProject(idx, { editingName: false })}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {proj.name}
                          </p>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0"
                            onClick={() => updateProject(idx, { editingName: true })}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Role */}
                    {proj.role && (
                      <p className="text-xs text-slate-500">{proj.role}</p>
                    )}

                    {/* Tech chips */}
                    {proj.tech.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {proj.tech.map((tech) => (
                          <Badge
                            key={tech}
                            variant="outline"
                            className="text-[10px] border-slate-200"
                          >
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Link */}
                    {proj.link && (
                      <a
                        href={proj.link.startsWith("http") ? proj.link : `https://${proj.link}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-xs text-primary underline"
                      >
                        {proj.link}
                      </a>
                    )}

                    {/* Bullets */}
                    {proj.editingBullets ? (
                      <div className="space-y-1">
                        <Textarea
                          value={proj.bullets.join("\n")}
                          onChange={(e) =>
                            updateProject(idx, {
                              bullets: e.target.value.split("\n"),
                            })
                          }
                          rows={3}
                          className="text-xs"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs"
                          onClick={() =>
                            updateProject(idx, { editingBullets: false })
                          }
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {t("builder.storyReview.done")}
                        </Button>
                      </div>
                    ) : (
                      proj.bullets.length > 0 && (
                        <div className="flex items-start gap-1">
                          <ul className="text-xs text-slate-600 list-disc pl-4 space-y-0.5">
                            {proj.bullets.map((b, bi) => (
                              <li key={bi}>{b}</li>
                            ))}
                          </ul>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 shrink-0 mt-0.5"
                            onClick={() =>
                              updateProject(idx, { editingBullets: true })
                            }
                          >
                            <Pencil className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      )
                    )}

                    {/* Missing fields */}
                    {proj.missing_fields.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertCircle className="h-3 w-3" />
                        {proj.missing_fields
                          .map((f) => t(`builder.storyReview.missing.${f}`, { defaultValue: f }))
                          .join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 3: Certifications ── */}
      <div className="rounded-md border border-slate-100 p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Award className="h-4 w-4 text-primary" />
          {t("builder.storyReview.certsTitle")}
          <span className="text-xs text-slate-400">({certs.length})</span>
        </div>
        {certs.length === 0 ? (
          <p className="text-xs text-slate-400">{t("builder.storyReview.noCerts")}</p>
        ) : (
          <div className="space-y-2">
            {certs.map((cert, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-md border p-3 flex items-start gap-3 transition-colors duration-150",
                  cert.selected
                    ? "border-primary/20 bg-primary/5"
                    : "border-slate-100 bg-slate-50/50 opacity-60",
                )}
              >
                <Checkbox
                  checked={cert.selected}
                  onCheckedChange={() => toggleCert(idx)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  {cert.editingName ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={cert.name}
                        onChange={(e) =>
                          updateCert(idx, { name: e.target.value })
                        }
                        className="h-7 text-sm"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => updateCert(idx, { editingName: false })}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {cert.name}
                      </p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => updateCert(idx, { editingName: true })}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-3 text-xs text-slate-500">
                    {cert.issuer && <span>{cert.issuer}</span>}
                    {cert.date && <span>{cert.date}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Apply button ── */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          {t("builder.storyReview.selectedCount", { count: selectedCount })}
        </p>
        <Button
          type="button"
          size="sm"
          disabled={selectedCount === 0 || isApplying}
          onClick={handleApply}
        >
          {isApplying ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              {t("builder.storyReview.applying")}
            </>
          ) : (
            t("builder.storyReview.apply")
          )}
        </Button>
      </div>
    </div>
  );
}
