import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAutosaveStore } from "@/store/useAutosaveStore";

export function useUnsavedGuard() {
  const { t } = useTranslation("diagnosis");
  const isDirty = useAutosaveStore((state) => state.isDirty);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = t("builder.unsavedChangesPrompt", "You have unsaved changes. Are you sure you want to leave?");
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, t]);

  return {
    isDirty,
    confirmLeave: () => {
      if (isDirty) {
        return window.confirm(t("builder.unsavedChangesPrompt", "You have unsaved changes. Are you sure you want to leave?"));
      }
      return true;
    }
  };
}
