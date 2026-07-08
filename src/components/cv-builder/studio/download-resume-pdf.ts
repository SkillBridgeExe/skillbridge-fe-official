import type { CvBuilderState } from "@/store/useCvBuilderStore";
import { createResumePdfBlob } from "@resume-engine/pdf/browser";
import { resolveBuilderTemplate } from "../preview/TemplatePicker";

export async function createStudioResumePdfBlob(state: CvBuilderState): Promise<Blob> {
  return createResumePdfBlob({
    data: state.getResumeData(),
    template: resolveBuilderTemplate(state.template),
  });
}

