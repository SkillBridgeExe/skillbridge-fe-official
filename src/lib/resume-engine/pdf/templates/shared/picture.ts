import type { ResumeData } from "@resume-engine/schema/resume/data";

export const hasTemplatePicture = (picture: ResumeData["picture"]) =>
	!picture.hidden && typeof picture.url === "string" && picture.url.trim() !== "";
