import { describe, expect, it } from "vitest";
import {
  getCarouselIndex,
  getMentorMarketplaceQuery,
  getMentorProfileCompletion,
  isMentorProfileReadOnly,
  selectFeaturedMentors,
} from "./mentor-marketplace";
import { QUERY_KEYS } from "@/constants/app";

describe("mentor marketplace query", () => {
  it("normalizes valid URL filters and drops invalid values", () => {
    const valid = getMentorMarketplaceQuery(
      new URLSearchParams("query=React&domain=Technology+%26+Software&minRating=4&sort=newest&page=2"),
    );
    const invalid = getMentorMarketplaceQuery(
      new URLSearchParams("minRating=9&sort=unknown&page=-1"),
    );

    expect(valid).toEqual({
      query: "React",
      domain: "Technology & Software",
      minRating: 4,
      sort: "newest",
      page: 2,
      limit: 6,
    });
    expect(invalid).toEqual({ sort: "rating_desc", page: 1, limit: 6 });
  });

  it("uses stable query keys for public and admin mentor resources", () => {
    expect(QUERY_KEYS.MENTORS({ page: 1 })).toEqual(["mentors", "list", { page: 1 }]);
    expect(QUERY_KEYS.MENTOR("nguyen-minh-an")).toEqual([
      "mentors",
      "detail",
      "nguyen-minh-an",
    ]);
    expect(QUERY_KEYS.ADMIN_MENTORS({ status: "PENDING_REVIEW" })).toEqual([
      "admin",
      "mentors",
      { status: "PENDING_REVIEW" },
    ]);
  });
});

describe("mentor profile state", () => {
  it("calculates completion from the fields required by backend submission", () => {
    expect(
      getMentorProfileCompletion({
        headline: "Senior Frontend Engineer",
        shortBio: "I help engineers grow.",
        domains: ["Technology & Software"],
        sessionPriceVnd: 450000,
        sessionDurationMinutes: 60,
        skills: [{ id: "react", displayName: "React", category: null }],
        linkedinUrl: "https://www.linkedin.com/in/nguyen-minh-an",
        phoneNumber: null,
      }),
    ).toEqual({ completed: 7, total: 7, percentage: 100, missing: [] });
  });

  it("requires at least one private verification contact", () => {
    expect(
      getMentorProfileCompletion({
        headline: "Senior Frontend Engineer",
        shortBio: "I help engineers grow.",
        domains: ["Technology & Software"],
        sessionPriceVnd: 450000,
        sessionDurationMinutes: 60,
        skills: [{ id: "react", displayName: "React", category: null }],
        linkedinUrl: null,
        phoneNumber: null,
      }),
    ).toEqual({
      completed: 6,
      total: 7,
      percentage: 86,
      missing: ["verificationContact"],
    });
  });

  it("locks profiles while pending review or suspended", () => {
    expect(isMentorProfileReadOnly("PENDING_REVIEW")).toBe(true);
    expect(isMentorProfileReadOnly("SUSPENDED")).toBe(true);
    expect(isMentorProfileReadOnly("APPROVED")).toBe(false);
  });
});

describe("mentor marketplace carousel", () => {
  it("prioritizes the summary spotlight and removes duplicate mentors", () => {
    const spotlight = { id: "mentor-2", name: "Two" };
    const mentors = [
      { id: "mentor-1", name: "One" },
      { id: "mentor-2", name: "Two duplicate" },
      { id: "mentor-3", name: "Three" },
      { id: "mentor-4", name: "Four" },
    ];

    expect(selectFeaturedMentors(spotlight, mentors)).toEqual([
      spotlight,
      mentors[0],
      mentors[2],
    ]);
  });

  it("supports missing and short mentor lists without empty carousel slots", () => {
    expect(selectFeaturedMentors(undefined, [])).toEqual([]);
    expect(selectFeaturedMentors(null, [{ id: "mentor-1" }])).toEqual([
      { id: "mentor-1" },
    ]);
  });

  it("wraps previous and next navigation across carousel boundaries", () => {
    expect(getCarouselIndex(0, -1, 3)).toBe(2);
    expect(getCarouselIndex(2, 1, 3)).toBe(0);
    expect(getCarouselIndex(0, 1, 1)).toBe(0);
    expect(getCarouselIndex(0, 1, 0)).toBe(0);
  });
});
