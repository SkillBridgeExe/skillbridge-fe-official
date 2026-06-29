import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ADMIN_TABLE_PAGES = [
  "AdminBillingPlans.tsx",
  "AdminBillingOrders.tsx",
  "AdminBillingSubscriptions.tsx",
  "AdminBusinessProfiles.tsx",
  "AdminJobReports.tsx",
  "AdminMentors.tsx",
];

describe("admin table markup", () => {
  it.each(ADMIN_TABLE_PAGES)(
    "%s uses the shared shadcn Table component",
    (fileName) => {
      const source = readFileSync(resolve(__dirname, fileName), "utf8");

      expect(source).toContain("@/components/ui/table");
      expect(source).not.toMatch(/<(table|thead|tbody|tr|th|td)\b/);
    },
  );
});
