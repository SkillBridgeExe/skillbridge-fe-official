import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

function getToastIcon(title?: string, variant?: string) {
  if (variant === "destructive") {
    return <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />;
  }
  if (title?.startsWith("✅") || title?.toLowerCase().includes("success") || title?.toLowerCase().includes("uploaded")) {
    return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
  }
  return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
}

function cleanTitle(title?: string) {
  if (!title) return title;
  // Remove leading emoji if we're showing an icon instead
  return title.replace(/^[✅❌⚠️ℹ️🔔]\s*/, "");
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3">
              {getToastIcon(title, variant ?? undefined)}
              <div className="grid gap-0.5 min-w-0">
                {title && (
                  <ToastTitle className="text-[13px] font-bold leading-snug">
                    {cleanTitle(title)}
                  </ToastTitle>
                )}
                {description && (
                  <ToastDescription className="text-[12px] leading-snug opacity-75 truncate max-w-[260px]">
                    {description}
                  </ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
