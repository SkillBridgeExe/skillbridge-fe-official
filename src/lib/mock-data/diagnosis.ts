// Mock data for Diagnosis station (UI demo only)

export interface Skill {
  name: string;
  cvScore: number;
  jdRequired: number;
  status: "present" | "partial" | "missing";
}

export interface ReviewItem {
  text: string;
  ok: boolean;
  hint?: string;
}

export interface ReviewSection {
  title: string;
  score: number;
  items: ReviewItem[];
}

export const MOCK_CV_REVIEW: ReviewSection[] = [
  {
    title: "CV Format & Structure",
    score: 54,
    items: [
      { text: "Consistent formatting between sections", ok: true },
      { text: "Clean use of whitespace and spacing", ok: true },
      { text: "Uses bold, italic, underline appropriately", ok: true },
      { text: "Avoid messy, hard-to-read layouts", ok: true },
      { text: "Missing education section", ok: false, hint: "Add: University Name · Degree · GPA · Year" },
      { text: "Dates not clearly formatted", ok: false, hint: "Use MM/YYYY format consistently (e.g. 01/2022 – 07/2025)" },
      { text: "Start bullet points with action verbs", ok: false, hint: "Replace 'Responsible for…' with 'Led…', 'Built…', 'Increased…'" },
    ],
  },
  {
    title: "ATS Compatibility",
    score: 70,
    items: [
      { text: "Uses standard fonts (Arial, Calibri, etc.)", ok: true },
      { text: "No tables or complex formatting", ok: true },
      { text: "PDF format preserved", ok: true },
      { text: "Avoid images, icons, or charts", ok: false, hint: "Remove all embedded images — ATS cannot parse visual elements" },
      { text: "No personal sensitive info (age, gender, status)", ok: false, hint: "Remove date of birth, gender, marital status fields" },
      { text: "Use Harvard CV template for best results", ok: false, hint: "Download a clean single-column template from Harvard OCS" },
    ],
  },
  {
    title: "Content Quality",
    score: 65,
    items: [
      { text: "Mentions relevant tech stack (React, TS)", ok: true },
      { text: "Experience section is detailed", ok: true },
      { text: "Add quantifiable results to achievements", ok: false, hint: "Instead of 'Improved UI' → 'Increased page load speed by 40%'" },
      { text: "Emphasize impact over responsibilities", ok: false, hint: "Start with results: 'Reduced bugs by 30%' not 'Was responsible for testing'" },
      { text: "Include 2-3 strong project descriptions", ok: false, hint: "Each project should have: Role, Tech Stack, 2-3 quantified outcomes" },
    ],
  },
  {
    title: "Basic Information",
    score: 83,
    items: [
      { text: "Full name, email, phone, location included", ok: true },
      { text: "Professional summary present", ok: true },
      { text: "LinkedIn profile linked", ok: true },
      { text: "GitHub or portfolio linked", ok: false, hint: "Add your GitHub URL or personal website link in the header" },
    ],
  },
];

export const MOCK_CV_TEXT = `Hoang Long Anh
hoangtira@gmail.com • +84-394287477

I'm a third-year Software Engineering student at FPT University with a strong passion for Front-End development.
- Skilled in React, JavaScript, and modern UI frameworks.
- Seeking a Front-End Developer internship to apply my skills and gain real-world experience.

EDUCATION
FPT University                              01/2022
Dai hoc, Software Engineers
GPA: 3.5/4

PROJECT
School Medical Management System            05/2025 - 07/2025
Project Leader & Lead Frontend Developer
Led frontend development of a comprehensive medical management web application for elementary schools, serving healthcare staff, parents, and administrators.

Key features:
- Multi-role Dashboard: Admin, Manager, Nurse, Parent
- Vaccination Workflow: 6-step process tracking
- Real-time Updates: Auto-refresh every 10 seconds
- Medical Incident Management: Report tracking with image upload
- Advanced Search & Filter across student data
- Authentication System: JWT + Google OAuth integration
- Responsive Design: Mobile-first approach

Technologies:
- Frontend: React.js, Vite, Ant Design, Day.js, Axios
- Authentication: JWT, Google OAuth
- Tools: Vite, ESLint, Git
- Backend Integration: RESTful APIs, FormData uploads`;

export const MOCK_HARD_SKILLS: Skill[] = [
  { name: "React / Next.js",     cvScore: 95, jdRequired: 90, status: "present" },
  { name: "TypeScript",          cvScore: 85, jdRequired: 80, status: "present" },
  { name: "Tailwind CSS",        cvScore: 100, jdRequired: 70, status: "present" },
  { name: "Node.js / Express",   cvScore: 40, jdRequired: 85, status: "missing" },
  { name: "AWS / Cloud",         cvScore: 15, jdRequired: 70, status: "missing" },
  { name: "Unit Testing (Jest)", cvScore: 0,  jdRequired: 60, status: "missing" },
  { name: "CI/CD Pipeline",      cvScore: 30, jdRequired: 65, status: "partial" },
];

export const MOCK_SOFT_SKILLS: Skill[] = [
  { name: "Communication",       cvScore: 80, jdRequired: 85, status: "present" },
  { name: "Teamwork",            cvScore: 90, jdRequired: 80, status: "present" },
  { name: "Problem Solving",     cvScore: 75, jdRequired: 90, status: "partial" },
  { name: "Leadership",          cvScore: 20, jdRequired: 70, status: "missing" },
  { name: "Time Management",     cvScore: 60, jdRequired: 75, status: "partial" },
];

export const RADAR_DATA = [
  { subject: "Frontend",  you: 92, required: 85 },
  { subject: "Backend",   you: 38, required: 80 },
  { subject: "DevOps",    you: 22, required: 60 },
  { subject: "Testing",   you: 15, required: 65 },
  { subject: "System Design", you: 55, required: 70 },
  { subject: "Soft Skills",   you: 80, required: 75 },
];

export const MOCK_INSIGHTS = {
  strengths: [
    "Solid modern frontend stack (React + TS + Tailwind)",
    "Tailwind CSS match score exceeds JD requirements",
    "Consistent TypeScript typing across all projects",
  ],
  improvements: [
    "Weak backend — Node.js/Express lacks depth required by JD",
    "Total absence of Cloud/AWS experience",
    "Unit Testing concepts are missing from the CV",
  ],
  nextSteps: [
    "Complete Node.js + REST API course (Est. 3 weeks)",
    "Learn AWS S3 and Lambda deployment via practical project",
    "Write Jest tests for exactly 3 existing portfolio projects",
  ],
};

