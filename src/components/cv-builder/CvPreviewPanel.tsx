import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";

export function CvPreviewPanel() {
  const store = useCvBuilderStore();

  return (
    <div className="flex flex-col h-full w-full max-w-[800px] mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-slate-500" />
            <Select value={store.template} onValueChange={store.setTemplate}>
              <SelectTrigger className="h-8 text-xs w-[140px] border-none shadow-none focus:ring-0 bg-slate-50">
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ats-modern">ATS Modern</SelectItem>
                <SelectItem value="creative" disabled>Creative (Pro)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-500" />
            <Select value={store.cvLanguage} onValueChange={(v) => store.setCvLanguage(v as any)}>
              <SelectTrigger className="h-8 text-xs w-[120px] border-none shadow-none focus:ring-0 bg-slate-50">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="vi">Vietnamese</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* A4 Page container */}
      <div className="flex-1 overflow-auto rounded-lg shadow-xl border border-slate-200 bg-white">
        <div 
          className="bg-white mx-auto min-h-[1056px] w-[793px] p-8 origin-top scale-[0.85] sm:scale-90 md:scale-100 transition-transform"
          style={{ fontFamily: store.template === "ats-modern" ? "Inter, sans-serif" : "inherit" }}
        >
          {/* Header */}
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
              {store.fullName || "YOUR NAME"}
            </h1>
            <p className="text-lg font-medium text-slate-700 mt-1">
              {store.targetPosition || "Target Position"}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-600">
              {store.email && <span>{store.email}</span>}
              {store.phone && <span>{store.phone}</span>}
              {store.location && <span>{store.location}</span>}
              {store.linkedin && <span>{store.linkedin}</span>}
              {store.github && <span>{store.github}</span>}
              {store.portfolio && <span>{store.portfolio}</span>}
            </div>
          </div>

          {/* Summary */}
          {store.summary && (
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">Professional Summary</h2>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{store.summary}</p>
            </div>
          )}

          {/* Experience */}
          {store.experience.some(e => e.company || e.position) && (
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">Work Experience</h2>
              <div className="space-y-3">
                {store.experience.map(exp => (
                  (exp.company || exp.position) && (
                    <div key={exp.id}>
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="text-sm font-bold text-slate-800">{exp.position}</h3>
                        <span className="text-xs font-semibold text-slate-600">{exp.startDate} {exp.endDate ? `- ${exp.endDate}` : ""}</span>
                      </div>
                      <div className="text-xs font-medium text-slate-700 italic mb-1">{exp.company}</div>
                      {exp.description && (
                        <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap pl-4 relative">
                          <span className="absolute left-0 top-1.5 w-1 h-1 bg-slate-400 rounded-full" />
                          {exp.description}
                        </div>
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {store.education.some(e => e.school || e.major) && (
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">Education</h2>
              <div className="space-y-3">
                {store.education.map(edu => (
                  (edu.school || edu.major) && (
                    <div key={edu.id}>
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="text-sm font-bold text-slate-800">{edu.school}</h3>
                        <span className="text-xs font-semibold text-slate-600">{edu.startYear} {edu.endYear ? `- ${edu.endYear}` : ""}</span>
                      </div>
                      <div className="flex justify-between items-baseline text-xs text-slate-700">
                        <span>{edu.degree ? `${edu.degree} in ` : ""}{edu.major}</span>
                        {edu.gpa && <span className="font-medium">GPA: {edu.gpa}</span>}
                      </div>
                      {edu.achievements && (
                        <p className="text-xs text-slate-600 mt-1 italic">{edu.achievements}</p>
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {store.projects.some(p => p.name) && (
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">Projects</h2>
              <div className="space-y-3">
                {store.projects.map(proj => (
                  proj.name && (
                    <div key={proj.id}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <h3 className="text-sm font-bold text-slate-800">{proj.name}</h3>
                        {proj.role && <span className="text-xs italic text-slate-600">| {proj.role}</span>}
                      </div>
                      {proj.tools && (
                        <div className="text-xs text-slate-700 mb-1"><span className="font-medium">Technologies:</span> {proj.tools}</div>
                      )}
                      {proj.description && (
                        <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap pl-4 relative">
                          <span className="absolute left-0 top-1.5 w-1 h-1 bg-slate-400 rounded-full" />
                          {proj.description}
                        </div>
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {(store.technicalSkills.length > 0 || store.softSkills.length > 0 || store.tools.length > 0 || store.languages.length > 0) && (
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">Skills</h2>
              <div className="space-y-1.5">
                {store.technicalSkills.length > 0 && (
                  <div className="text-xs"><span className="font-bold text-slate-800 w-24 inline-block">Technical:</span> <span className="text-slate-700">{store.technicalSkills.join(", ")}</span></div>
                )}
                {store.tools.length > 0 && (
                  <div className="text-xs"><span className="font-bold text-slate-800 w-24 inline-block">Tools:</span> <span className="text-slate-700">{store.tools.join(", ")}</span></div>
                )}
                {store.softSkills.length > 0 && (
                  <div className="text-xs"><span className="font-bold text-slate-800 w-24 inline-block">Soft Skills:</span> <span className="text-slate-700">{store.softSkills.join(", ")}</span></div>
                )}
                {store.languages.length > 0 && (
                  <div className="text-xs"><span className="font-bold text-slate-800 w-24 inline-block">Languages:</span> <span className="text-slate-700">{store.languages.join(", ")}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Certifications */}
          {store.certifications.some(c => c.name) && (
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">Certifications</h2>
              <div className="space-y-2">
                {store.certifications.map(cert => (
                  cert.name && (
                    <div key={cert.id} className="flex justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{cert.name}</span>
                        {cert.organization && <span className="text-slate-600"> — {cert.organization}</span>}
                      </div>
                      <span className="text-slate-600 font-medium">{cert.issueDate}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
