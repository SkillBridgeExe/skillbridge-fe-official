import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, ZoomIn } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "react-i18next";

interface AvatarCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
  isPending?: boolean;
}

/**
 * Creates a cropped image File from a source image and crop area.
 * Uses OffscreenCanvas when available, falls back to regular Canvas.
 */
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputSize = 512,
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob failed"));
          return;
        }
        resolve(new File([blob], "avatar.png", { type: "image/png" }));
      },
      "image/png",
      1,
    );
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

export function AvatarCropDialog({
  open,
  imageSrc,
  onClose,
  onCropComplete,
  isPending,
}: AvatarCropDialogProps) {
  const { t } = useTranslation("common");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropAreaChange = useCallback(
    (_croppedArea: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedFile);
    } catch (e) {
      console.error("Crop failed:", e);
    }
  }, [imageSrc, croppedAreaPixels, onCropComplete]);

  const handleClose = useCallback(() => {
    if (isPending) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onClose();
  }, [isPending, onClose]);

  if (!imageSrc) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 rounded-2xl overflow-hidden border-slate-200/60">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-center font-poppins text-xl font-black text-slate-900">
            {t("profile.cropAvatarTitle", { defaultValue: "Chọn ảnh đại diện" })}
          </DialogTitle>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative w-full bg-slate-950" style={{ height: 340 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropAreaChange}
            style={{
              containerStyle: {
                background: "#0f172a",
              },
              cropAreaStyle: {
                border: "3px solid rgba(255,255,255,0.6)",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
              },
            }}
          />
        </div>

        {/* Zoom slider */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Zoom out"
            >
              <Minus className="w-4 h-4" />
            </button>

            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={([v]) => setZoom(v)}
              className="flex-1 [&>span:first-child]:h-1.5 [&>span:first-child]:bg-slate-200 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-2 [&_[role=slider]]:border-[#00AEEF] [&_[role=slider]]:bg-white [&_[role=slider]]:shadow-md [&>span:first-child>span]:bg-[#00AEEF]"
            />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Zoom in"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info text */}
        <div className="px-6 pb-3">
          <p className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
            {t("profile.cropAvatarHint", {
              defaultValue: "Kéo để di chuyển, dùng thanh trượt để phóng to/thu nhỏ.",
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-6 pb-6 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-xl px-5 text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            {t("profile.cropCancel", { defaultValue: "Hủy" })}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || !croppedAreaPixels}
            className="rounded-xl px-6 bg-[#00AEEF] hover:bg-[#049bd7] text-white text-sm font-bold shadow-[0_4px_14px_rgba(0,174,239,0.25)]"
          >
            {isPending
              ? t("profile.cropSaving", { defaultValue: "Đang lưu..." })
              : t("profile.cropSave", { defaultValue: "Lưu" })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
