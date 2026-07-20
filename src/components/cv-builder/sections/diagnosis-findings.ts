// Adapter THUẦN: map kết quả chẩn đoán (BE-authored, verbatim) → rows cho panel builder.
// KHÔNG detector mới, KHÔNG LLM, KHÔNG paraphrase (anti-fabrication).
import type { CvReviewData, GapReportDto } from "@shared/api";
import type { ResumeDocumentV1 } from "@/lib/resume-engine/document-v1";
import {
  collectElementIssues,
  isCommentaryKind,
} from "@/components/companion/skills/element-issues";
import {
  resolveDiagnosisFixAnchor,
  type DiagnosisFixAnchor,
} from "@/components/companion/skills/diagnosis-fix-anchor";

export interface DiagnosisFindingRow {
  id: string;
  /** BE-authored text — render VERBATIM. null → dùng labelKey. */
  label: string | null;
  /** i18n key (namespace diagnosis) khi không có BE text. */
  labelKey: string | null;
  /** Trích đoạn bullet gốc (rows từ bullet_feedback) để user nhận ra — verbatim, cắt 110 ký tự. */
  excerpt: string | null;
  /** ok=true → jump được; ok=false → "có thể đã xử lý" (mờ); null → row thông tin, không nút Sửa. */
  anchor: DiagnosisFixAnchor | null;
}

const MAX_BULLET_ROWS = 6;
const MAX_ACTION_ROWS = 3;

export function buildDiagnosisFindingRows(args: {
  reviewData: CvReviewData | null;
  gapReport: GapReportDto | null;
  document: ResumeDocumentV1;
}): DiagnosisFindingRow[] {
  const { reviewData, gapReport, document } = args;
  if (!reviewData) return [];

  const rows: DiagnosisFindingRow[] = [];

  // 1) Per-bullet BE feedback — cụ thể nhất, anchor bằng chính text bullet.
  const bullets = (reviewData.bullet_feedback ?? []).filter((b) => b.tips.length > 0);
  bullets.slice(0, MAX_BULLET_ROWS).forEach((b, i) => {
    rows.push({
      id: `bullet:${i}`,
      label: b.tips.join(" · "),
      labelKey: null,
      excerpt: b.text.length > 110 ? `${b.text.slice(0, 110)}…` : b.text,
      anchor: resolveDiagnosisFixAnchor({ document, evidenceText: b.text }),
    });
  });

  // 2) Element issues (CV-only kinds chạy được không cần gapReport; gap_item khi có).
  const issues = collectElementIssues({
    jdMatch: reviewData.jdMatch ?? null,
    reviewData,
    gapReport,
  }).filter((issue) => !isCommentaryKind(issue.kind));
  for (const issue of issues) {
    rows.push({
      id: issue.id,
      label: issue.why, // BE-authored verbatim hoặc null
      labelKey: issue.why ? null : (issue.whyKey ?? issue.whatKey),
      excerpt: null,
      anchor:
        issue.kind === "listed_no_evidence" && issue.id.startsWith("evidence:")
          ? resolveDiagnosisFixAnchor({
              document,
              skill: {
                canonical: issue.id.slice("evidence:".length),
                displayName: issue.id.slice("evidence:".length),
              },
            })
          : null,
    });
  }

  // 3) Prioritized actions — meta-advice, không anchor.
  (reviewData.top_summary?.prioritized_actions ?? [])
    .slice(0, MAX_ACTION_ROWS)
    .forEach((action, i) => {
      rows.push({ id: `action:${i}`, label: action, labelKey: null, excerpt: null, anchor: null });
    });

  return rows;
}
