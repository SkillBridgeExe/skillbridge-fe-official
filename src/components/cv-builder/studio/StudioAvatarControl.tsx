import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { EyeOff, Upload, Trash2 } from "lucide-react";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { TemplateCapabilities } from "@/lib/resume-engine/template-meta";
import { cn } from "@/lib/utils";
import { AvatarCropDialog } from "@/components/ui/avatar-crop-dialog";
import { SegmentedButton } from "./SegmentedButton";

const AVATAR_SHAPES = [
  { value: "circle", labelKey: "shapeCircle" },
  { value: "rounded", labelKey: "shapeRounded" },
  { value: "square", labelKey: "shapeSquare" },
] as const;

const ACCENT_COLORS = [
  { value: "#0f172a", label: "Slate" },
  { value: "#2563eb", label: "Blue" },
  { value: "#16a34a", label: "Green" },
  { value: "#7c3aed", label: "Violet" },
  { value: "#dc2626", label: "Red" },
  { value: "#d97706", label: "Amber" },
];

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";


interface StudioAvatarControlProps {
  layoutCapabilities: TemplateCapabilities;
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export function StudioAvatarControl({ layoutCapabilities }: StudioAvatarControlProps) {
  const { t } = useTranslation("diagnosis");
  const store = useCvBuilderStore();
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    
    if (!file.type.match(/image\/(png|jpe?g|webp)/i)) {
      toast({
        title: t("builder.inspector.unsupportedImageType"),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t("builder.inspector.imageTooLarge"),
        variant: "destructive",
      });
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCropImageSrc(dataUrl);
      setCropDialogOpen(true);
    } catch (e) {
      console.error("Error reading file", e);
    }
  };

  const onCropComplete = (croppedFile: File) => {
    readFileAsDataUrl(croppedFile).then((dataUrl) => {
      store.setBasicInfo("photoUrl", dataUrl);
      setCropDialogOpen(false);
      setCropImageSrc(null);
    });
  };

  const handleRemove = () => {
    store.setBasicInfo("photoUrl", "");
  };



  const avatarShapeClass =
    store.resumePictureShape === "circle"
      ? "rounded-full"
      : store.resumePictureShape === "rounded"
        ? "rounded-2xl"
        : "rounded-md";

  const avatarPreviewStyle = {
    width: Math.max(48, Math.min(128, store.resumePictureSize || 64)),
    height: Math.max(48, Math.min(128, store.resumePictureSize || 64)),
    borderWidth: Math.max(0, store.resumePictureBorderWidth || 0),
    borderColor: store.resumePictureBorderColor || "transparent",
  };

  return (
    <div className={cn("space-y-4 pt-2 border-t border-slate-100")}>
      {layoutCapabilities.supportsAvatar ? (
        <div className="rounded-xl border border-slate-100 bg-white p-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "grid place-items-center overflow-hidden border bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400",
                avatarShapeClass,
                store.resumeAtsSafeMode && "opacity-50 grayscale",
              )}
              style={avatarPreviewStyle}
            >
              {store.photoUrl ? (
                <img
                  src={store.photoUrl}
                  alt={t("builder.inspector.avatarPreview")}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{t("builder.inspector.noPhoto")}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-700">
                {t("builder.inspector.pictureAvatar")}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                {store.resumeAtsSafeMode
                  ? t("builder.inspector.atsHiddenAvatarDesc")
                  : store.photoUrl
                    ? t("builder.inspector.avatarPreviewReady")
                    : t("builder.inspector.avatarEmptyHint")}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!layoutCapabilities.supportsAvatar ? (
        <div className="rounded-md border border-slate-100 bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-500">
          {t("builder.inspector.unsupportedTemplateAvatar")}
        </div>
      ) : store.resumeAtsSafeMode ? (
        <div className="rounded-md border border-slate-100 bg-slate-50 p-3 space-y-2">
          <p className="text-[11px] leading-relaxed text-slate-500">
            {t("builder.inspector.atsHiddenAvatarDesc")}
          </p>
          <button
            type="button"
            onClick={() => store.setResumeAtsSafeMode(false)}
            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-700 transition-colors hover:border-sky-300 hover:bg-sky-100"
          >
            {t("builder.inspector.turnOffAtsCTA")}
          </button>
        </div>
      ) : null}

      <div className={cn("space-y-4", (!layoutCapabilities.supportsAvatar) && "opacity-50 pointer-events-none")}>
        <div className="flex gap-4 items-start">
          <input
            type="file"
            ref={fileInputRef}
            accept=".png, .jpg, .jpeg, .webp"
            className="hidden"
            onChange={(e) => {
               handleFile(e.target.files?.[0]);
               e.target.value = ""; // clear input
            }}
          />
          <div 
            className="relative group w-[72px] h-[72px] rounded-md border border-slate-200 bg-slate-50 overflow-hidden shrink-0 transition-colors hover:bg-slate-100 flex items-center justify-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {store.photoUrl ? (
              <>
                <img src={store.photoUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:text-white hover:bg-red-500/80 rounded-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove();
                    }}
                    title={t("builder.inspector.avatarRemove")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div 
                className="text-slate-400 hover:text-slate-600 flex flex-col items-center justify-center"
                title={t("builder.inspector.avatarUpload")}
              >
                <Upload className="w-5 h-5" />
              </div>
            )}
          </div>


        </div>
      </div>

      {store.resumePictureVisible !== false && (
        <div className={cn("space-y-4 pt-3 border-t border-slate-100", 
          (store.resumeAtsSafeMode || !layoutCapabilities.supportsAvatar) && "opacity-50 pointer-events-none"
        )}>
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t("builder.inspector.avatarShape")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {AVATAR_SHAPES.map((option) => (
                <SegmentedButton
                  key={option.value}
                  active={store.resumePictureShape === option.value}
                  onClick={() => store.setResumePictureShape(option.value)}
                >
                  <span className="block text-center">{t(`builder.inspector.${option.labelKey}`) as string}</span>
                </SegmentedButton>
              ))}
            </div>
          </div>
          
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t("builder.inspector.avatarSize")}
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="48"
                max="128"
                step="4"
                value={store.resumePictureSize}
                onChange={(e) => store.setResumePictureSize(Number(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="text-xs font-medium text-slate-600 w-8 text-right">
                {store.resumePictureSize}px
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t("builder.inspector.avatarBorder")}
            </p>
            <div className="grid grid-cols-6 gap-2">
              <button
                type="button"
                aria-label={t("builder.inspector.noBorder", "No Border")}
                title="No Border"
                onClick={() => {
                  store.setResumePictureBorderColor("rgba(0,0,0,0)");
                  store.setResumePictureBorderWidth(0);
                }}
                className={cn(
                  "h-6 rounded-full border-2 transition-transform hover:scale-105 flex items-center justify-center bg-slate-50",
                  store.resumePictureBorderColor === "rgba(0,0,0,0)" || store.resumePictureBorderWidth === 0
                    ? "border-sky-400 ring-2 ring-sky-100" 
                    : "border-slate-200 shadow-sm",
                )}
              >
                <EyeOff className="w-3 h-3 text-slate-400" />
              </button>
              {ACCENT_COLORS.slice(0, 5).map((color) => (
                <button
                  key={color.value}
                  type="button"
                  aria-label={t("builder.inspector.chooseColor", { color: color.label })}
                  title={color.label}
                  onClick={() => {
                    store.setResumePictureBorderColor(color.value);
                    if (store.resumePictureBorderWidth === 0) store.setResumePictureBorderWidth(2);
                  }}
                  className={cn(
                    "h-6 rounded-full border-2 transition-transform hover:scale-105",
                    store.resumePictureBorderColor === color.value && store.resumePictureBorderWidth > 0
                      ? "border-sky-400 ring-2 ring-sky-100" 
                      : "border-white shadow-sm",
                  )}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-slate-500">{t("builder.inspector.borderWidth", "Width")}</span>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={store.resumePictureBorderWidth}
                onChange={(e) => store.setResumePictureBorderWidth(Number(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="text-xs font-medium text-slate-600 w-6 text-right">
                {store.resumePictureBorderWidth}px
              </span>
            </div>
          </div>
        </div>
      )}

      {cropDialogOpen && cropImageSrc && (
        <AvatarCropDialog
          open={cropDialogOpen}
          onClose={() => {
            setCropDialogOpen(false);
            setCropImageSrc(null);
          }}
          imageSrc={cropImageSrc}
          onCropComplete={onCropComplete}
        />
      )}
    </div>
  );
}
