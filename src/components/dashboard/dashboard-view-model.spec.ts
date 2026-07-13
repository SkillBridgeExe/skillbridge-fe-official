import { describe, expect, it } from "vitest";
import {
  buildInterviewSummary,
  groupDashboardSkills,
  resolveDashboardGoal,
  selectScoredInterviews,
} from "./dashboard-view-model";

describe("dashboard view model", () => {
  it("uses profile target job before career goal and CV fallback", () => {
    expect(
      resolveDashboardGoal(
        { targetJob: "Frontend Engineer", careerGoal: "Tech Lead" },
        "backend_developer",
      ),
    ).toBe("Frontend Engineer");
    expect(
      resolveDashboardGoal({ careerGoal: "Tech Lead" }, "backend_developer"),
    ).toBe("Tech Lead");
    expect(resolveDashboardGoal(null, "backend_developer")).toBe(
      "backend developer",
    );
  });

  it("maps skill levels to percentages and averages by real category", () => {
    expect(
      groupDashboardSkills([
        { skillId: "1", name: "React", category: "Frontend", level: 4 },
        { skillId: "2", name: "CSS", category: "Frontend", level: 2 },
        { skillId: "3", name: "SQL", category: null, level: 5 },
      ]),
    ).toEqual([
      {
        category: "Frontend",
        averagePercent: 60,
        skills: [
          { id: "1", name: "React", level: 4, percent: 80 },
          { id: "2", name: "CSS", level: 2, percent: 40 },
        ],
      },
      {
        category: "Other",
        averagePercent: 100,
        skills: [{ id: "3", name: "SQL", level: 5, percent: 100 }],
      },
    ]);
  });

  it("summarizes only completed interviews with an overall score", () => {
    expect(
      buildInterviewSummary([
        {
          status: "COMPLETED",
          overallScore: 80,
          semanticScore: 70,
          communicationScore: 90,
        },
        {
          status: "IN_PROGRESS",
          overallScore: 100,
          semanticScore: 100,
          communicationScore: 100,
        },
        {
          status: "COMPLETED",
          overallScore: null,
          semanticScore: 50,
          communicationScore: null,
        },
      ]),
    ).toEqual({
      completed: 1,
      averageOverall: 80,
      averageSemantic: 70,
      averageCommunication: 90,
    });
  });

  it("keeps zero scores and excludes incomplete or unscored interviews", () => {
    expect(
      selectScoredInterviews([
        {
          status: "COMPLETED",
          overallScore: 0,
          semanticScore: null,
          communicationScore: null,
        },
        {
          status: "COMPLETED",
          overallScore: null,
          semanticScore: 75,
          communicationScore: 80,
        },
        {
          status: "CANCELLED",
          overallScore: 90,
          semanticScore: 90,
          communicationScore: 90,
        },
      ]).map((item) => item.overallScore),
    ).toEqual([0]);
  });
});
