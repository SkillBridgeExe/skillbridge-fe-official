import { MentorInfo, ScheduledSession } from "@/types/mentor";

export const MENTOR_DATA: Record<string, MentorInfo> = {
  "Sarah Connor": {
    name: "Sarah Connor",
    role: "Sr. Engineering Mentor",
    bio: "With 12+ years of experience in frontend engineering, I specialize in React, system design, and mentoring engineers to reach staff level. I've led teams at Google and helped 200+ engineers advance their careers.",
    rating: 4.9,
    sessions: 124,
    expertise: ["React", "System Design", "Performance Optimization", "Career Growth", "Architecture"],
    education: "MS in Computer Science, Stanford University",
    languages: ["English", "Spanish", "French"],
    availability: "Mon, Wed, Fri - 9AM to 5PM GMT",
    location: "San Francisco, CA",
    responseTime: "2 hours"
  }
};

export const INITIAL_SCHEDULED_SESSIONS: ScheduledSession[] = [
  {
    id: "1",
    date: "Mar 04, 2026",
    time: "09:00 AM - 10:00 AM",
    duration: "1 hour",
    status: "completed",
    topic: "System Design Review",
    note: "Discussed scalability and database choices",
    recording: "available"
  },
  {
    id: "2",
    date: "Mar 05, 2026",
    time: "02:00 PM - 03:00 PM",
    duration: "1 hour",
    status: "scheduled",
    topic: "Career Roadmap Discussion"
  },
  {
    id: "3",
    date: "Mar 07, 2026",
    time: "10:00 AM - 11:00 AM",
    duration: "1 hour",
    status: "scheduled",
    topic: "Frontend System Design Mock Interview"
  },
  {
    id: "4",
    date: "Mar 09, 2026",
    time: "04:00 PM",
    duration: "45 min",
    status: "declined",
    topic: "Mentorship Session Request"
  }
];
