import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AvatarCropDialog } from "@/components/ui/avatar-crop-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QUERY_KEYS } from "@/constants/app";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  deleteMyAvatar,
  getMyAvatarUrl,
  getSafeAvatarUrl,
  isProtectedAvatarUrl,
  uploadMyAvatar,
  validateAvatarFile,
} from "@/services/user-profile.service";

interface MentorAvatarEditorProps {
  avatarUrl: string | null | undefined;
  displayName: string;
  disabled?: boolean;
}

export function MentorAvatarEditor({
  avatarUrl,
  displayName,
  disabled = false,
}: MentorAvatarEditorProps) {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarQuery = useQuery({
    queryKey: QUERY_KEYS.USER_AVATAR,
    queryFn: getMyAvatarUrl,
    enabled: isProtectedAvatarUrl(avatarUrl),
  });
  const avatarSrc = avatarQuery.data || getSafeAvatarUrl(avatarUrl);

  const invalidateAvatarConsumers = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_AVATAR }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_MENTOR_PROFILE }),
      queryClient.invalidateQueries({ queryKey: ["mentors"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "mentors"] }),
    ]);
  }, [queryClient]);

  const uploadMutation = useMutation({
    mutationFn: uploadMyAvatar,
    onSuccess: async () => {
      await invalidateAvatarConsumers();
      toast({ title: t("profile.toastAvatarSavedTitle") });
    },
    onError: (error) => {
      toast({
        title: t("profile.toastAvatarFailedTitle"),
        description: getApiErrorMessage(error, t("profile.toastAvatarFailedDesc")),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMyAvatar,
    onSuccess: async () => {
      await invalidateAvatarConsumers();
      toast({ title: t("profile.toastAvatarDeletedTitle") });
    },
    onError: (error) => {
      toast({
        title: t("profile.toastAvatarFailedTitle"),
        description: getApiErrorMessage(error, t("profile.toastAvatarFailedDesc")),
        variant: "destructive",
      });
    },
  });

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const validationError = validateAvatarFile(file);
    if (validationError) {
      toast({
        title: t("profile.toastAvatarInvalidTitle"),
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(String(reader.result));
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = useCallback(
    (file: File) => {
      setCropDialogOpen(false);
      setCropImageSrc(null);
      uploadMutation.mutate(file);
    },
    [uploadMutation],
  );

  const pending = avatarQuery.isLoading || uploadMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 dark:border-slate-800 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <Avatar className="h-20 w-20 rounded-2xl border border-border bg-card">
            <AvatarImage src={avatarSrc} className="object-cover" alt={displayName} />
            <AvatarFallback className="rounded-2xl bg-primary font-black text-primary-foreground">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
          {pending ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/45">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground">{displayName}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {t("mentor.dashboard.avatarHint")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            disabled={disabled || pending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="mr-2 h-4 w-4" />
            {t("profile.uploadAvatar")}
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={disabled || pending}
            onChange={(event) => {
              handleFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl text-destructive hover:text-destructive"
            disabled={disabled || pending || !avatarSrc}
            onClick={() => deleteMutation.mutate()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("profile.deleteAvatar")}
          </Button>
        </div>
      </div>

      <AvatarCropDialog
        open={cropDialogOpen}
        imageSrc={cropImageSrc}
        isPending={uploadMutation.isPending}
        onClose={() => {
          setCropDialogOpen(false);
          setCropImageSrc(null);
        }}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
