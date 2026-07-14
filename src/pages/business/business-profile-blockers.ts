import type { BusinessProfileBlocker } from "@/types/jobs";

const BLOCKER_COPY: Record<BusinessProfileBlocker, string> = {
  PROFILE_SUSPENDED: "Resolve the company profile suspension",
  WORK_EMAIL_UNVERIFIED: "Verify your work email",
  CONTACT_NAME_MISSING: "Add a business contact name",
  COMPANY_NAME_MISSING: "Add the company name",
  WEBSITE_MISSING: "Add the company website",
  WORK_EMAIL_DOMAIN_MISMATCH: "Use a work email matching the company website",
  INDUSTRY_MISSING: "Choose the company industry",
  SHORT_DESCRIPTION_MISSING: "Add a short company description",
};

export function describeBusinessProfileBlockers(blockers: BusinessProfileBlocker[]): string[] {
  return blockers.map((blocker) => BLOCKER_COPY[blocker]);
}
