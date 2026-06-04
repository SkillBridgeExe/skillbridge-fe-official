import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { 
  User, Target, FileText, GraduationCap, Briefcase, 
  FolderGit2, Wrench, Award, CheckCircle 
} from "lucide-react";
import * as Sections from "./sections";

const SECTIONS = [
  { id: "basic-info", title: "Basic Information", icon: User, component: Sections.BasicInfoSection },
  { id: "career-target", title: "Career Target", icon: Target, component: Sections.CareerTargetSection },
  { id: "summary", title: "Professional Summary", icon: FileText, component: Sections.SummarySection },
  { id: "education", title: "Education", icon: GraduationCap, component: Sections.EducationSection },
  { id: "experience", title: "Work Experience", icon: Briefcase, component: Sections.ExperienceSection },
  { id: "projects", title: "Projects", icon: FolderGit2, component: Sections.ProjectsSection },
  { id: "skills", title: "Skills", icon: Wrench, component: Sections.SkillsSection },
  { id: "certifications", title: "Certifications", icon: Award, component: Sections.CertificationsSection },
  { id: "review", title: "Review & Polish", icon: CheckCircle, component: Sections.ReviewSection },
];

export function CvFormPanel() {
  const { activeSection, setActiveSection, getSectionStatuses } = useCvBuilderStore();
  const statuses = getSectionStatuses(); // This might trigger a re-render on every keystroke, but fine for MVP

  return (
    <div className="p-4 space-y-4">
      <Accordion 
        type="single" 
        collapsible 
        value={SECTIONS[activeSection].id}
        onValueChange={(val) => {
          const idx = SECTIONS.findIndex(s => s.id === val);
          if (idx !== -1) setActiveSection(idx);
        }}
        className="w-full space-y-3"
      >
        {SECTIONS.map((section, index) => {
          const Icon = section.icon;
          const status = index < 8 ? statuses[index]?.status : null; // Review section has no status

          return (
            <AccordionItem key={section.id} value={section.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm data-[state=open]:border-primary/50 data-[state=open]:shadow-md transition-all">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">{section.title}</span>
                  {status === "completed" && <div className="w-2 h-2 rounded-full bg-emerald-500 ml-2" />}
                  {status === "needs-improvement" && <div className="w-2 h-2 rounded-full bg-amber-500 ml-2" />}
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t border-slate-100 bg-slate-50/30">
                <section.component />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
