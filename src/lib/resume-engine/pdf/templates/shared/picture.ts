import type { ResumeData } from "@resume-engine/schema/resume/data";

export const hasTemplatePicture = (picture: ResumeData["picture"]) => !picture.hidden && picture.url.trim() !== "";
