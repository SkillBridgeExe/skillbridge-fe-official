import type { CanonicalCvDocument } from "@shared/api";

export type SeniorityHint = "intern" | "fresher" | "junior" | "mid" | "senior" | null;

export type CvLengthQualityInput = {
  document: CanonicalCvDocument;
  pageCount?: number;
  targetRole?: string | null;
  seniorityHint?: SeniorityHint;
};

export type CvLengthQualityResult = {
  status: "good" | "watch" | "too_long";
  pageCount: number | null;
  targetPages: 1 | 2;
  headlineKey: string;
  explanationKey: string;
  sectionSuggestions: Array<{
    section: "summary" | "experience" | "projects" | "skills" | "certifications" | "education" | "languages" | "activities";
    severity: "info" | "warning" | "critical";
    reasonKey: string;
    actionKey: string;
  }>;
};

function estimatePageCount(doc: CanonicalCvDocument): number {
  // A very rough conservative heuristic.
  // 3500 chars roughly equals 1 page with average formatting.
  // We don't want to overshoot and scare users unnecessarily.
  let totalLength = 0;
  
  if (doc.summary) totalLength += doc.summary.length;
  
  doc.experience.forEach(exp => {
    totalLength += (exp.org?.length || 0) + (exp.role?.length || 0) + 100; // Headers
    exp.bullets.forEach(b => totalLength += b.length);
  });
  
  doc.projects.forEach(proj => {
    totalLength += (proj.name?.length || 0) + (proj.role?.length || 0) + 100;
    proj.bullets.forEach(b => totalLength += b.length);
  });

  doc.education.forEach(edu => {
    totalLength += (edu.school?.length || 0) + (edu.degree?.length || 0) + 50;
    edu.highlights.forEach(h => totalLength += h.length);
  });

  doc.certifications.forEach(cert => {
    totalLength += (cert.name?.length || 0) + (cert.issuer?.length || 0) + 30;
  });

  doc.activities.forEach(act => {
    totalLength += (act.org?.length || 0) + (act.role?.length || 0) + 50;
    act.bullets.forEach(b => totalLength += b.length);
  });

  // Skills typically take up less space per char but line breaks matter.
  const skillsCount = doc.skills.technical.length + doc.skills.soft.length + doc.skills.languages.length + doc.skills.tools.length;
  totalLength += skillsCount * 30;

  if (totalLength < 4000) return 1;
  if (totalLength < 8000) return 2;
  return 3;
}

function inferSeniorityHint(value?: string | null): SeniorityHint {
  const normalized = value?.toLowerCase() ?? "";
  if (/\b(intern|internship|fresher|fresh|student)\b/.test(normalized)) return "fresher";
  if (/\bjunior\b/.test(normalized)) return "junior";
  if (/\b(mid|middle)\b/.test(normalized)) return "mid";
  if (/\b(senior|lead|principal|staff)\b/.test(normalized)) return "senior";
  return null;
}

export function evaluateCvLengthQuality(input: CvLengthQualityInput): CvLengthQualityResult {
  const { document: doc } = input;
  
  const heuristicPages = estimatePageCount(doc);
  const estimatedPages = Math.max(input.pageCount ?? 0, heuristicPages);
  const seniorityHint = input.seniorityHint ?? inferSeniorityHint(input.targetRole);
  
  let targetPages: 1 | 2 = 1;
  if (seniorityHint === "mid" || seniorityHint === "senior") {
    targetPages = 2;
  }

  const suggestions: CvLengthQualityResult["sectionSuggestions"] = [];

  // Summary rule
  if (doc.summary && (doc.summary.length > 500 || doc.summary.split(/[.!?\n]/).filter(s => s.trim().length > 10).length > 3)) {
    suggestions.push({
      section: "summary",
      severity: "warning",
      reasonKey: "builder.lengthGuard.reason.summaryLong",
      actionKey: "builder.lengthGuard.action.summaryShorten",
    });
  }

  // Projects rule
  if ((seniorityHint === "intern" || seniorityHint === "fresher" || seniorityHint === "junior") && doc.projects.length > 3) {
    suggestions.push({
      section: "projects",
      severity: "warning",
      reasonKey: "builder.lengthGuard.reason.manyProjects",
      actionKey: "builder.lengthGuard.action.keepBestProjects",
    });
  }

  // Experience / Projects weak density rule
  let weakBulletsCount = 0;
  let totalBulletsCount = 0;
  const weakBulletRegex = /^(.{0,40})$/; // Very short bullet
  
  doc.experience.forEach(exp => {
    exp.bullets.forEach(b => {
      totalBulletsCount++;
      if (weakBulletRegex.test(b.trim()) || !/\d+/.test(b) && b.length < 60) {
        weakBulletsCount++;
      }
    });
  });
  doc.projects.forEach(proj => {
    proj.bullets.forEach(b => {
      totalBulletsCount++;
      if (weakBulletRegex.test(b.trim()) || !/\d+/.test(b) && b.length < 60) {
        weakBulletsCount++;
      }
    });
  });

  if (totalBulletsCount > 0 && weakBulletsCount / totalBulletsCount > 0.4) {
    suggestions.push({
      section: "experience", // or projects, defaulting to experience for jump
      severity: "warning",
      reasonKey: "builder.lengthGuard.reason.weakBullets",
      actionKey: "builder.lengthGuard.action.improveBullets",
    });
  }

  // Skills rule
  const totalSkills = doc.skills.technical.length + doc.skills.soft.length + doc.skills.languages.length + doc.skills.tools.length;
  if (totalSkills > 15) {
    suggestions.push({
      section: "skills",
      severity: "info",
      reasonKey: "builder.lengthGuard.reason.manySkills",
      actionKey: "builder.lengthGuard.action.focusSkills",
    });
  }

  // Certifications rule
  if (doc.certifications.length > 3) {
    suggestions.push({
      section: "certifications",
      severity: "info",
      reasonKey: "builder.lengthGuard.reason.manyCerts",
      actionKey: "builder.lengthGuard.action.trimCerts",
    });
  }

  // Determine Status
  let status: "good" | "watch" | "too_long" = "good";

  if (estimatedPages > targetPages) {
    if (estimatedPages >= 3) {
      status = "too_long";
    } else {
      status = "watch";
    }
  }

  // If page count is good but there are many warnings, we can watch
  if (status === "good" && suggestions.filter(s => s.severity === "warning").length >= 2) {
    status = "watch";
  }

  let headlineKey = "builder.lengthGuard.headline.good";
  let explanationKey = "builder.lengthGuard.explain.good";

  if (status === "too_long") {
    headlineKey = "builder.lengthGuard.headline.tooLong";
    explanationKey = "builder.lengthGuard.explain.tooLong";
  } else if (status === "watch") {
    headlineKey = "builder.lengthGuard.headline.watch";
    explanationKey = "builder.lengthGuard.explain.watch";
  }

  return {
    status,
    pageCount: estimatedPages,
    targetPages,
    headlineKey,
    explanationKey,
    // Sort suggestions: critical > warning > info, take top 3
    sectionSuggestions: suggestions.sort((a, b) => {
      const w = { critical: 3, warning: 2, info: 1 };
      return w[b.severity] - w[a.severity];
    }).slice(0, 3)
  };
}
