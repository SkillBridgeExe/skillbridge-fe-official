export interface ScheduledSession {
  id: string;
  date: string;
  time: string;
  duration: string;
  status: 'scheduled' | 'pending' | 'completed' | 'cancelled' | 'started' | string;
  topic?: string;
  note?: string;
  recording?: string;
}

export interface SessionNote {
  id: string;
  sessionDate: string;
  mentorName: string;
  notes: string;
  aiSummary: string;
  chatHistory: Array<{ role: string; content: string; time: string }>;
  createdAt: string;
}

export interface SessionGoal {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface SessionRecording {
  id: string;
  sessionId: string;
  sessionDate: string;
  mentorName: string;
  duration: number;
  size: string;
  createdAt: string;
  videoUrl?: string;
}

export interface MentorInfo {
  name: string;
  role: string;
  bio: string;
  rating: number;
  sessions: number;
  expertise: string[];
  education: string;
  languages: string[];
  availability: string;
  location: string;
  responseTime: string;
}
