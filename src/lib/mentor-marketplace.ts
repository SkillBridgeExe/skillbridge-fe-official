import {
  MENTOR_SORTS,
  type MentorListQuery,
  type MentorProfileDto,
  type MentorProfileStatus,
  type MentorSort,
} from "@/services/mentor.service";

export const MENTOR_PAGE_SIZE = 6;

const MENTOR_SORT_SET = new Set<string>(MENTOR_SORTS);

export function getMentorMarketplaceQuery(searchParams: URLSearchParams): MentorListQuery {
  const query = clean(searchParams.get("query"));
  const domain = clean(searchParams.get("domain"));
  const ratingInput = Number(searchParams.get("minRating"));
  const minRating = Number.isInteger(ratingInput) && ratingInput >= 1 && ratingInput <= 5
    ? ratingInput
    : undefined;
  const sortInput = searchParams.get("sort") ?? "rating_desc";
  const sort: MentorSort = MENTOR_SORT_SET.has(sortInput)
    ? (sortInput as MentorSort)
    : "rating_desc";
  const pageInput = Number(searchParams.get("page"));
  const page = Number.isInteger(pageInput) && pageInput > 0 ? pageInput : 1;

  return {
    ...(query ? { query } : {}),
    ...(domain ? { domain } : {}),
    ...(minRating ? { minRating } : {}),
    sort,
    page,
    limit: MENTOR_PAGE_SIZE,
  };
}

type CompletionField =
  | "headline"
  | "shortBio"
  | "domains"
  | "sessionPriceVnd"
  | "sessionDurationMinutes"
  | "skills"
  | "linkedinUrl"
  | "phoneNumber";

type CompletionMissingField = Exclude<CompletionField, "linkedinUrl" | "phoneNumber"> | "verificationContact";

type CompletionProfile = Pick<MentorProfileDto, CompletionField>;

export function getMentorProfileCompletion(profile: CompletionProfile) {
  const checks: Array<[CompletionMissingField, boolean]> = [
    ["headline", Boolean(profile.headline?.trim())],
    ["shortBio", Boolean(profile.shortBio?.trim())],
    ["domains", profile.domains.length > 0],
    ["sessionPriceVnd", profile.sessionPriceVnd > 0],
    ["sessionDurationMinutes", profile.sessionDurationMinutes > 0],
    ["skills", profile.skills.length > 0],
    [
      "verificationContact",
      Boolean(profile.linkedinUrl?.trim() || profile.phoneNumber?.trim()),
    ],
  ];
  const missing = checks.filter(([, complete]) => !complete).map(([field]) => field);
  const total = checks.length;
  const completed = total - missing.length;
  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
    missing,
  };
}

export function isMentorProfileReadOnly(status: MentorProfileStatus): boolean {
  return status === "PENDING_REVIEW" || status === "SUSPENDED";
}

export function selectFeaturedMentors<T extends { id: string }>(
  spotlight: T | null | undefined,
  mentors: readonly T[],
  limit = 3,
): T[] {
  const featured: T[] = [];
  const seen = new Set<string>();

  for (const mentor of spotlight ? [spotlight, ...mentors] : mentors) {
    if (seen.has(mentor.id)) continue;
    seen.add(mentor.id);
    featured.push(mentor);
    if (featured.length === limit) break;
  }

  return featured;
}

export function getCarouselIndex(current: number, delta: -1 | 1, total: number): number {
  if (total <= 1) return 0;
  return (current + delta + total) % total;
}

function clean(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
