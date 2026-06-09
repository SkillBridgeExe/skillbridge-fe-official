import { useCvBuilderStore, type CvLanguage } from "@/store/useCvBuilderStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, LayoutTemplate } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CV_CONTENT_LABELS } from "@/constants/cv-content-labels";

export function CvPreviewPanel() {
  const store = useCvBuilderStore();
  const { t } = useTranslation("diagnosis");
  // Nhãn trên BẢN CV theo ngôn ngữ NỘI DUNG CV (không phải ngôn ngữ giao diện app).
  const L = CV_CONTENT_LABELS[store.cvLanguage];

  const isEmpty = !store.fullName.trim() && 
    !store.targetPosition.trim() && 
    !store.email.trim() && 
    !store.phone.trim() && 
    !store.summary.trim() && 
    !store.experience.some(e => e.company || e.position) && 
    !store.education.some(e => e.school || e.major) && 
    !store.projects.some(p => p.name) && 
    !store.certifications.some(c => c.name) &&
    store.technicalSkills.length === 0 && 
    store.softSkills.length === 0 && 
    store.tools.length === 0 && 
    store.languages.length === 0;

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
            <Select value={store.cvLanguage} onValueChange={(v) => store.setCvLanguage(v as CvLanguage)}>
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
          {isEmpty ? (
            <div className="w-full h-full min-h-[900px] flex flex-col justify-between py-10 px-8 select-none animate-none">
              {/* Header Skeleton */}
              <div className="flex flex-col items-center border-b border-slate-200 pb-6 mb-6">
                <div className="w-48 h-8 bg-[#F1F1EF] rounded mb-2.5 animate-none" />
                <div className="w-32 h-4 bg-[#F1F1EF] rounded mb-4 animate-none" />
                <div className="flex gap-4">
                  <div className="w-24 h-3 bg-[#F1F1EF] rounded animate-none" />
                  <div className="w-24 h-3 bg-[#F1F1EF] rounded animate-none" />
                </div>
              </div>

              {/* Body skeleton với overlay caption ở giữa */}
              <div className="flex-1 space-y-8 relative">
                {/* Caption ở giữa overlay */}
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none px-4 text-center">
                  <div className="bg-white/95 border border-[#EAEAEA] rounded-xl p-5 max-w-[320px] shadow-lg pointer-events-auto">
                    <p className="text-[11px] font-bold text-[#2F3437] uppercase tracking-wider mb-1">
                      {L.previewTitle}
                    </p>
                    <p className="text-[13px] text-[#787774] leading-normal font-medium">
                      {t("builder.previewEmpty")}
                    </p>
                  </div>
                </div>

                {/* Nhóm 1 (Summary/Experience) */}
                <div className="space-y-3 opacity-60">
                  <div className="w-28 h-4 bg-[#F1F1EF] rounded animate-none" />
                  <div className="w-full h-3 bg-[#F1F1EF] rounded animate-none" />
                  <div className="w-[90%] h-3 bg-[#F1F1EF] rounded animate-none" />
                </div>

                {/* Nhóm 2 (Experience) */}
                <div className="space-y-4 opacity-50">
                  <div className="w-28 h-4 bg-[#F1F1EF] rounded animate-none" />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="w-36 h-3 bg-[#F1F1EF] rounded animate-none" />
                      <div className="w-16 h-3 bg-[#F1F1EF] rounded animate-none" />
                    </div>
                    <div className="w-24 h-3 bg-[#F1F1EF] rounded animate-none" />
                    <div className="w-[95%] h-3 bg-[#F1F1EF] rounded animate-none" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="w-40 h-3 bg-[#F1F1EF] rounded animate-none" />
                      <div className="w-16 h-3 bg-[#F1F1EF] rounded animate-none" />
                    </div>
                    <div className="w-24 h-3 bg-[#F1F1EF] rounded animate-none" />
                    <div className="w-[85%] h-3 bg-[#F1F1EF] rounded animate-none" />
                  </div>
                </div>

                {/* Nhóm 3 (Education) */}
                <div className="space-y-3 opacity-40">
                  <div className="w-28 h-4 bg-[#F1F1EF] rounded animate-none" />
                  <div className="flex justify-between">
                    <div className="w-48 h-3 bg-[#F1F1EF] rounded animate-none" />
                    <div className="w-16 h-3 bg-[#F1F1EF] rounded animate-none" />
                  </div>
                  <div className="w-32 h-3 bg-[#F1F1EF] rounded animate-none" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
              {store.fullName || L.namePlaceholder}
            </h1>
            <p className="text-lg font-medium text-slate-700 mt-1">
              {store.targetPosition || L.positionPlaceholder}
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
              <h2 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">{L.summary}</h2>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{store.summary}</p>
            </div>
          )}

          {/* Experience */}
          {store.experience.some(e => e.company || e.position) && (
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">{L.experience}</h2>
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
              <h2 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">{L.education}</h2>
              <div className="space-y-3">
                {store.education.map(edu => (
                  (edu.school || edu.major) && (
                    <div key={edu.id}>
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="text-sm font-bold text-slate-800">{edu.school}</h3>
                        <span className="text-xs font-semibold text-slate-600">{edu.startYear} {edu.endYear ? `- ${edu.endYear}` : ""}</span>
                      </div>
                      <div className="flex justify-between items-baseline text-xs text-slate-700">
                        <span>{edu.degree ? `${edu.degree} ${L.degreeIn} ` : ""}{edu.major}</span>
                        {edu.gpa && <span className="font-medium">{L.gpa}: {edu.gpa}</span>}
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
              <h2 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">{L.projects}</h2>
              <div className="space-y-3">
                {store.projects.map(proj => (
                  proj.name && (
                    <div key={proj.id}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <h3 className="text-sm font-bold text-slate-800">{proj.name}</h3>
                        {proj.role && <span className="text-xs italic text-slate-600">| {proj.role}</span>}
                      </div>
                      {proj.tools && (
                        <div className="text-xs text-slate-700 mb-1"><span className="font-medium">{L.technologies}:</span> {proj.tools}</div>
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
              <h2 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">{L.skills}</h2>
              <div className="space-y-1.5">
                {store.technicalSkills.length > 0 && (
                  <div className="text-xs"><span className="font-bold text-slate-800 w-24 inline-block">{L.technical}:</span> <span className="text-slate-700">{store.technicalSkills.join(", ")}</span></div>
                )}
                {store.tools.length > 0 && (
                  <div className="text-xs"><span className="font-bold text-slate-800 w-24 inline-block">{L.tools}:</span> <span className="text-slate-700">{store.tools.join(", ")}</span></div>
                )}
                {store.softSkills.length > 0 && (
                  <div className="text-xs"><span className="font-bold text-slate-800 w-24 inline-block">{L.softSkills}:</span> <span className="text-slate-700">{store.softSkills.join(", ")}</span></div>
                )}
                {store.languages.length > 0 && (
                  <div className="text-xs"><span className="font-bold text-slate-800 w-24 inline-block">{L.languages}:</span> <span className="text-slate-700">{store.languages.join(", ")}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Certifications */}
          {store.certifications.some(c => c.name) && (
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">{L.certifications}</h2>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
