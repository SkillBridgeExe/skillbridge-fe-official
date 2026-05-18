import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { getCourseSummaryForAI, ALL_COURSES } from "@/components/learning/Courses-data";

export interface SkillGap {
  skill: string;
  currentLevel: number;
  requiredLevel: number;
  priority: "high" | "medium" | "low";
}

export interface RoadmapCourse {
  courseId: string;
  courseName: string;
  level: string;
  estimatedHours: number;
  weekNumber: number;
  reason: string;
  skills: string[];
}

export interface WeeklyBlock {
  week: number;
  courseId: string;
  courseName: string;
  sessionIds: string[];
  hoursPerWeek: number;
  focus: string;
}

export interface GeneratedRoadmap {
  title: string;
  targetRole: string;
  totalWeeks: number;
  totalHours: number;
  summary: string;
  courses: RoadmapCourse[];
  weeklySchedule: WeeklyBlock[];
  aiAdvice: string;
}

export async function generateRoadmapWithAI(
  skillGaps: SkillGap[],
  targetRole: string,
  hoursPerWeek: number = 10,
): Promise<GeneratedRoadmap> {
  const allCourses = getCourseSummaryForAI();
  const gapKeywords = skillGaps.map((gap) => gap.skill.toLowerCase());
  const relevantCourses = allCourses.filter((course) =>
    course.skills.some((skill) =>
      gapKeywords.some(
        (gap) => skill.toLowerCase().includes(gap) || gap.includes(skill.toLowerCase()),
      ),
    ),
  );
  const courses = relevantCourses.length > 0 ? relevantCourses : allCourses.slice(0, 6);

  const { data: roadmap } = await httpClient.post<GeneratedRoadmap>(
    API_ROUTES.ROADMAP.GENERATE,
    {
      skillGaps,
      targetRole,
      hoursPerWeek,
      courses,
    },
  );

  roadmap.courses = roadmap.courses.map((roadmapCourse) => {
    const fullCourse = ALL_COURSES.find((course) => course.id === roadmapCourse.courseId);
    return fullCourse
      ? {
          ...roadmapCourse,
          skills: fullCourse.skills,
          estimatedHours: fullCourse.estimatedHours,
        }
      : roadmapCourse;
  });

  return roadmap;
}

export interface WeekPlanFromRoadmap {
  weekNumber: number;
  moduleId: string;
  moduleTitle: string;
  sessions: {
    id: string;
    moduleId: string;
    sessionNumber: number;
    title: string;
    skill: string;
    dayOfWeek: number;
    estimatedMinutes: number;
    status: "completed" | "in-progress" | "locked";
    stars: number;
    maxStars: number;
    sections: {
      id: string;
      title: string;
      completed: boolean;
      exercises: number;
      completedExercises: number;
      type: string;
    }[];
    resources: { title: string; url: string; type: string }[];
  }[];
}

export function roadmapToWeekPlans(roadmap: GeneratedRoadmap): WeekPlanFromRoadmap[] {
  const daySpread = [1, 2, 3, 4, 5];
  const assignedCourseIds = new Set<string>();
  const result: WeekPlanFromRoadmap[] = [];

  roadmap.weeklySchedule.forEach((block) => {
    const course = ALL_COURSES.find((item) => item.id === block.courseId);
    if (assignedCourseIds.has(block.courseId)) return;
    assignedCourseIds.add(block.courseId);

    const courseSessions = course?.sessions ?? [];
    const sessions: WeekPlanFromRoadmap["sessions"] = courseSessions.map((session, index) => ({
      id: `gen-${block.courseId}-${index}`,
      moduleId: block.courseId,
      sessionNumber: index + 1,
      title: session.title,
      skill: course?.shortName ?? block.courseName,
      dayOfWeek: daySpread[index % daySpread.length],
      estimatedMinutes: session.estimatedMinutes,
      status: index === 0 ? "in-progress" : "locked",
      stars: 0,
      maxStars: 5,
      sections: session.sections.map((section) => ({
        id: section.id,
        title: section.title,
        completed: false,
        exercises: 5,
        completedExercises: 0,
        type: section.type,
      })),
      resources: session.resources ?? [],
    }));

    result.push({
      weekNumber: block.week,
      moduleId: block.courseId,
      moduleTitle: block.courseName,
      sessions,
    });
  });

  return result;
}
