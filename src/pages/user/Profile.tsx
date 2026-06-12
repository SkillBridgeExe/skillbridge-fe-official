import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Mail,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  GraduationCap,
  BookOpen,
  Briefcase,
  Calendar,
  CreditCard,
  Gauge,
  Linkedin,
  Github,
  Globe,
  ArrowUpRight,
  Lock,
  Edit3,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { QUERY_KEYS } from "@/constants/app";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate, StatusBadge } from "@/lib/billing-ui";
import { getMySubscription, getMyUsage } from "@/services/billing.service";
import {
  deleteMyAvatar,
  getSafeAvatarUrl,
  getMyAvatarUrl,
  getMyProfile,
  getMySkills,
  replaceMySkills,
  updateMyProfile,
  uploadMyAvatar,
  validateAvatarFile,
} from "@/services/user-profile.service";
import { useAuthStore } from "@/store/useAuthStore";
import type { EntitlementFeatureDto } from "@/api/billing";
import type { UserSkillDto } from "@/api/user/skills";

interface ProfileFormState {
  displayName: string;
  university: string;
  major: string;
  experienceYears: string;
  targetJob: string;
  careerGoal: string;
  githubUrl: string;
  linkedinUrl: string;
  portfolioUrl: string;
}

type CompletenessTipField =
  | "avatar"
  | "displayName"
  | "targetJob"
  | "university"
  | "major"
  | "experienceYears"
  | "careerGoal"
  | "githubUrl"
  | "linkedinUrl"
  | "portfolioUrl";

const EMPTY_PROFILE_FORM: ProfileFormState = {
  displayName: "",
  university: "",
  major: "",
  experienceYears: "",
  targetJob: "",
  careerGoal: "",
  githubUrl: "",
  linkedinUrl: "",
  portfolioUrl: "",
};

function toInputValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function cleanText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const getLevelLabel = (level: number, t: (key: string) => string) => {
  switch (level) {
    case 1:
      return t("profile.skillLevels.beginner");
    case 2:
      return t("profile.skillLevels.intermediate");
    case 3:
      return t("profile.skillLevels.advanced");
    case 4:
      return t("profile.skillLevels.expert");
    case 5:
      return t("profile.skillLevels.master");
    default:
      return t("profile.skillLevels.beginner");
  }
};

const getLevelColor = (level: number) => {
  switch (level) {
    case 1:
      return "bg-slate-100 text-slate-650 border-slate-200/60";
    case 2:
      return "bg-sky-50 text-sky-600 border-sky-100/60";
    case 3:
      return "bg-cyan-50 text-cyan-600 border-cyan-100/60";
    case 4:
      return "bg-indigo-50 text-indigo-650 border-indigo-100/60";
    case 5:
      return "bg-violet-50 text-violet-650 border-violet-100/60 font-bold shadow-indigo-100/20";
    default:
      return "bg-slate-100 text-slate-650 border-slate-200/60";
  }
};

const LevelSelector = ({ value, onChange }: { value: number; onChange: (val: number) => void }) => {
  return (
    <div className="flex items-center gap-1 bg-slate-105 p-0.5 rounded-lg border border-slate-200/40">
      {[1, 2, 3, 4, 5].map((level) => {
        const isActive = level <= value;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] transition-all duration-150 ${
              isActive
                ? "bg-[#00AEEF] text-white shadow-[0_1px_4px_rgba(0,174,239,0.25)] scale-105"
                : "text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            }`}
          >
            {level}
          </button>
        );
      })}
    </div>
  );
};

function getUsagePercent(feature: Pick<EntitlementFeatureDto, "limit" | "used" | "unlimited">) {
  if (feature.unlimited) return 100;
  if (feature.limit <= 0) return 0;
  return Math.min(100, Math.round((feature.used / feature.limit) * 100));
}

function formatFeatureName(value: string) {
  return value
    .replace(/^cv_/, "CV ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function pickProfileBillingFeatures(features: EntitlementFeatureDto[]) {
  const priority = ["cv_review", "cv_upload", "cv_jd_match", "roadmap_generate", "interview_session"];
  return [...features]
    .sort((a, b) => {
      const aIndex = priority.indexOf(a.featureKey);
      const bIndex = priority.indexOf(b.featureKey);
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    })
    .slice(0, 4);
}

function BillingProfilePanel({
  subscription,
  features,
  isLoading,
  t,
}: {
  subscription: { planCode: string; status: string; currentPeriodStart: string; currentPeriodEnd: string } | null | undefined;
  features: EntitlementFeatureDto[];
  isLoading: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const visibleFeatures = useMemo(() => pickProfileBillingFeatures(features), [features]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/40">
      <div className="border-b border-slate-100 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-poppins text-lg font-black text-slate-900">
              {t("profile.billingTitle")}
            </h3>
            <p className="mt-1 text-xs text-slate-500">{t("profile.billingDesc")}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-[#00AEEF]">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>
      </div>
      <div className="space-y-4 p-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-16 rounded-2xl bg-slate-100" />
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-16 rounded-2xl bg-slate-100" />
              ))}
            </div>
          </div>
        ) : subscription ? (
          <>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {t("profile.currentPlan")}
                  </p>
                  <p className="mt-1 truncate font-poppins text-2xl font-black leading-none text-slate-950">
                    {subscription.planCode}
                  </p>
                </div>
                <StatusBadge status={subscription.status} />
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold leading-5 text-slate-500">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-[#00AEEF]" />
                <span className="truncate">
                  {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                </span>
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  {t("profile.usageOverview")}
                </p>
                <Gauge className="h-4 w-4 text-[#00AEEF]" />
              </div>
              {visibleFeatures.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {visibleFeatures.map((feature) => (
                    <div key={feature.featureKey} className="rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm">
                      <p className="truncate text-[11px] font-black text-slate-800" title={feature.featureKey}>
                        {t(`billing.pricing.features.${feature.featureKey}`, {
                          defaultValue: formatFeatureName(feature.featureKey),
                        })}
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[#00AEEF]" style={{ width: `${getUsagePercent(feature)}%` }} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span>{feature.used}</span>
                        <span>{feature.unlimited ? t("billing.common.unlimited") : feature.limit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                  {t("billing.me.emptyDesc")}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
            <p className="font-bold text-slate-900">{t("profile.noBillingPlan")}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{t("profile.noBillingDesc")}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 text-xs font-bold">
            <Link to="/billing/me">{t("profile.viewBilling")}</Link>
          </Button>
          <Button asChild className="h-10 rounded-xl bg-[#00AEEF] text-xs font-bold text-white hover:bg-[#049bd7]">
            <Link to="/pricing">
              {t("profile.upgradePlan")}
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUser } = useAuthStore();
  const [form, setForm] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);
  const [skillsDraft, setSkillsDraft] = useState<UserSkillDto[]>([]);
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [activeAccountTab, setActiveAccountTab] = useState("personal");

  const profileQuery = useQuery({
    queryKey: QUERY_KEYS.USER_PROFILE,
    queryFn: getMyProfile,
  });

  const avatarQuery = useQuery({
    queryKey: QUERY_KEYS.USER_AVATAR,
    queryFn: getMyAvatarUrl,
  });

  const skillsQuery = useQuery({
    queryKey: QUERY_KEYS.USER_SKILLS,
    queryFn: getMySkills,
  });

  const billingSubscriptionQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_SUBSCRIPTION,
    queryFn: getMySubscription,
  });

  const billingUsageQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_USAGE,
    queryFn: getMyUsage,
  });

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    setForm({
      displayName: toInputValue(profile.displayName ?? currentUser?.name),
      university: toInputValue(profile.profile?.university),
      major: toInputValue(profile.profile?.major),
      experienceYears: toInputValue(profile.profile?.experienceYears),
      targetJob: toInputValue(profile.profile?.targetJob),
      careerGoal: toInputValue(profile.profile?.careerGoal),
      githubUrl: toInputValue(profile.profile?.githubUrl),
      linkedinUrl: toInputValue(profile.profile?.linkedinUrl),
      portfolioUrl: toInputValue(profile.profile?.portfolioUrl),
    });
  }, [currentUser?.name, profileQuery.data]);

  useEffect(() => {
    const rawSkills = skillsQuery.data ?? [];
    setSkillsDraft(
      rawSkills.map((s) => ({
        skillId: toInputValue(s.skillId),
        level: Number(s.level) || 1,
      }))
    );
  }, [skillsQuery.data]);


  const initials = useMemo(
    () => (currentUser?.name?.slice(0, 2).toUpperCase() || "SK"),
    [currentUser?.name],
  );

  const displayName = form.displayName || currentUser?.name || "";
  const email = profileQuery.data?.email || currentUser?.email || "";
  const avatarSrc =
    avatarQuery.data ||
    getSafeAvatarUrl(profileQuery.data?.avatarUrl) ||
    getSafeAvatarUrl(currentUser?.avatar);
  const billingSubscription = billingSubscriptionQuery.data;
  const billingUsage = billingUsageQuery.data;
  const billingFeatures = billingUsage?.features ?? billingSubscription?.features ?? [];
  const currentPlanLabel = billingSubscriptionQuery.isLoading
    ? t("profile.planLoading")
    : billingSubscription?.planCode || t("profile.noPlanShort");

  const completeness = useMemo(() => {
    let score = 0;
    if (form.displayName?.trim()) score += 15;
    if (form.university?.trim()) score += 10;
    if (form.major?.trim()) score += 10;
    if (form.experienceYears?.trim()) score += 10;
    if (form.targetJob?.trim()) score += 15;
    if (form.githubUrl?.trim()) score += 10;
    if (form.linkedinUrl?.trim()) score += 10;
    if (form.portfolioUrl?.trim()) score += 5;
    if (form.careerGoal?.trim()) score += 10;
    if (avatarSrc) score += 5;
    return score;
  }, [form, avatarSrc]);

  const completenessTips = useMemo(() => {
    const tips: { value: number; field: CompletenessTipField }[] = [];
    if (!avatarSrc) tips.push({ value: 5, field: "avatar" });
    if (!form.displayName?.trim()) tips.push({ value: 15, field: "displayName" });
    if (!form.targetJob?.trim()) tips.push({ value: 15, field: "targetJob" });
    if (!form.university?.trim()) tips.push({ value: 10, field: "university" });
    if (!form.major?.trim()) tips.push({ value: 10, field: "major" });
    if (!form.experienceYears?.trim()) tips.push({ value: 10, field: "experienceYears" });
    if (!form.careerGoal?.trim()) tips.push({ value: 10, field: "careerGoal" });
    if (!form.githubUrl?.trim()) tips.push({ value: 10, field: "githubUrl" });
    if (!form.linkedinUrl?.trim()) tips.push({ value: 10, field: "linkedinUrl" });
    if (!form.portfolioUrl?.trim()) tips.push({ value: 5, field: "portfolioUrl" });
    return tips;
  }, [form, avatarSrc]);

  const saveProfileMutation = useMutation({
    mutationFn: () => {
      const dispName = cleanText(form.displayName);
      const univ = cleanText(form.university);
      const maj = cleanText(form.major);
      const exp = form.experienceYears.trim() ? Number(form.experienceYears) : null;
      const job = cleanText(form.targetJob);
      const goal = cleanText(form.careerGoal);
      const github = cleanText(form.githubUrl);
      const linkedin = cleanText(form.linkedinUrl);
      const portfolio = cleanText(form.portfolioUrl);

      return updateMyProfile({
        displayName: dispName,
        university: univ,
        major: maj,
        experienceYears: exp,
        targetJob: job,
        careerGoal: goal,
        githubUrl: github,
        linkedinUrl: linkedin,
        portfolioUrl: portfolio,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE });
      toast({ title: t("profile.toastSavedTitle"), description: t("profile.toastSavedDesc") });
    },
    onError: (error) => {
      toast({
        title: t("profile.toastSaveFailedTitle"),
        description: getApiErrorMessage(error, t("profile.toastSaveFailedDesc")),
        variant: "destructive",
      });
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: uploadMyAvatar,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_AVATAR }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE }),
      ]);
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

  const deleteAvatarMutation = useMutation({
    mutationFn: deleteMyAvatar,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_AVATAR }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE }),
      ]);
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

  const saveSkillsMutation = useMutation({
    mutationFn: () =>
      replaceMySkills(
        skillsDraft
          .filter((skill) => (skill.skillId ?? "").trim().length > 0)
          .map((skill) => {
            const sId = (skill.skillId ?? "").trim();
            const lvl = Number(skill.level) || 1;
            return {
              skillId: sId,
              level: lvl,
            };
          }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_SKILLS });
      toast({ title: t("profile.toastSkillsSavedTitle") });
    },
    onError: (error) => {
      toast({
        title: t("profile.toastSkillsFailedTitle"),
        description: getApiErrorMessage(error, t("profile.toastSkillsFailedDesc")),
        variant: "destructive",
      });
    },
  });

  const updateField = (field: keyof ProfileFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleAvatarChange = (file: File | undefined) => {
    if (!file) return;
    const validationError = validateAvatarFile(file);
    if (validationError) {
      toast({
        title: t("profile.toastAvatarInvalidTitle"),
        description: validationError || t("profile.toastAvatarInvalidDesc"),
        variant: "destructive",
      });
      return;
    }
    uploadAvatarMutation.mutate(file);
  };

  const addSkill = () => {
    setSkillsDraft((current) => [...current, { skillId: "", level: 1 }]);
  };

  const updateSkill = (index: number, patch: Partial<UserSkillDto>) => {
    setSkillsDraft((current) =>
      current.map((skill, skillIndex) =>
        skillIndex === index ? { ...skill, ...patch } : skill,
      ),
    );
  };

  const removeSkill = (index: number) => {
    setSkillsDraft((current) => current.filter((_, skillIndex) => skillIndex !== index));
  };

  return (
    <Layout hideFooter>
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[#00AEEF]">
            {t("profile.eyebrow")}
          </p>
          <h1 className="mt-1 font-poppins text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
            {t("profile.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-xs md:text-sm leading-6 text-slate-500">
            {t("profile.subtitle")}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.01)] overflow-hidden mb-6 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5 text-center sm:text-left">
              <div className="relative group shrink-0">
                <Avatar className="h-24 w-24 border-2 border-slate-100 shadow-md bg-white relative z-10 overflow-hidden rounded-full">
                  <AvatarImage src={avatarSrc || "https://github.com/shadcn.png"} className="object-cover" />
                  <AvatarFallback className="bg-[#00AEEF] text-2xl font-black text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                
                <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white bg-green-500 z-20 shadow-md flex items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                </span>
                
                <Label className="absolute inset-0 bg-black/45 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer z-30 border-2 border-transparent">
                  <Camera className="h-5 w-5 mb-0.5" />
                  <span className="text-[9px] font-black uppercase tracking-wider">
                    {uploadAvatarMutation.isPending ? t("profile.uploading") : t("profile.uploadAvatar")}
                  </span>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(event) => handleAvatarChange(event.target.files?.[0])}
                    disabled={uploadAvatarMutation.isPending}
                  />
                </Label>
              </div>

              <div className="space-y-1 pb-1 sm:mb-0">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">
                    {displayName}
                  </h2>
                  <Badge className="bg-sky-50 text-[#00AEEF] hover:bg-sky-55 border border-sky-100 px-2.5 py-0.5 font-bold text-[10px] uppercase rounded-full tracking-wider">
                    {currentUser?.role?.toUpperCase()}
                  </Badge>
                  <Badge className="gap-1.5 rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#00AEEF] hover:bg-cyan-50">
                    <CreditCard className="h-3 w-3" />
                    {currentPlanLabel}
                  </Badge>
                </div>
                <p className="text-slate-500 text-sm flex items-center justify-center sm:justify-start gap-1.5 font-semibold">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {email}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 sm:mt-0 z-10 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => deleteAvatarMutation.mutate()}
                disabled={deleteAvatarMutation.isPending || !avatarSrc}
                className="h-10 rounded-xl border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all text-xs font-bold"
              >
                <Trash2 className="mr-1.5 h-4 w-4 text-slate-400 group-hover:text-red-500" />
                {t("profile.deleteAvatar")}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <Card className="rounded-3xl border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.01)] bg-white overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-poppins text-lg font-black text-slate-900">
                    {t("profile.completeness")}
                  </CardTitle>
                  <span className={`text-sm font-black rounded-full px-2.5 py-0.5 ${
                    completeness === 100 
                      ? "bg-green-50 text-green-600 border border-green-100" 
                      : "bg-[#00AEEF]/10 text-[#00AEEF]"
                  }`}>
                    {completeness}%
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  {t("profile.completenessDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={completeness} className="h-2.5 bg-slate-100 [&>div]:bg-[#00AEEF]" />
                
                {completeness < 100 ? (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t("profile.completenessTipsTitle")}</p>
                    <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                      {completenessTips.map((tip) => (
                        <div key={tip.field} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="text-slate-650 font-medium">
                            {t(`profile.completenessTips.${tip.field}`)}
                          </span>
                          <span className="text-[#00AEEF] font-bold">+{tip.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 bg-green-50/50 p-3 rounded-2xl border border-green-100/60 text-green-750 text-xs">
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-bold">{t("profile.completenessPerfectTitle")}</p>
                      <p className="text-green-600 font-medium">{t("profile.completenessPerfectDesc")}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.01)] bg-white overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-poppins text-lg font-black text-slate-900">
                    {t("profile.skillsTitle")}
                  </CardTitle>
                  {!isEditingSkills && skillsDraft.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsEditingSkills(true)}
                      className="h-8 w-8 p-0 text-slate-450 hover:text-[#00AEEF] hover:bg-sky-50 rounded-lg transition-colors"
                      aria-label={t("profile.updateSkillsList")}
                    >
                      <Edit3 className="h-4.5 w-4.5" />
                    </Button>
                  )}
                </div>
                <CardDescription className="text-xs">{t("profile.skillsDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <AnimatePresence mode="wait">
                  {!isEditingSkills ? (
                    <motion.div
                      key="skills-view"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      {skillsDraft.length === 0 ? (
                        <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                          <p className="text-xs text-slate-550 font-medium">{t("profile.noSkills")}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsEditingSkills(true)}
                            className="mt-3 text-xs text-[#00AEEF] hover:text-[#049bd7] hover:bg-sky-55 font-bold h-9 rounded-xl px-4"
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            {t("profile.addSkillNow")}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {skillsDraft.map((skill, index) => {
                              if (!skill.skillId.trim()) return null;
                              return (
                                <div
                                  key={`${skill.skillId}-${index}`}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-sm transition-all duration-300 hover:scale-105 ${getLevelColor(
                                    skill.level,
                                  )}`}
                                >
                                  <span>{skill.skillId}</span>
                                  <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                                  <span className="opacity-80 text-[10px]">
                                    {getLevelLabel(skill.level, t)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditingSkills(true)}
                            className="w-full rounded-xl border-slate-200 text-slate-700 font-bold hover:bg-slate-55 transition-colors h-10 text-xs"
                          >
                            <Edit3 className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                            {t("profile.updateSkillsList")}
                          </Button>
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="skills-edit"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
                        {skillsDraft.map((skill, index) => (
                          <div
                            key={`${skill.skillId}-${index}`}
                            className="grid grid-cols-[1fr_auto_2rem] items-center gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100"
                          >
                            <Input
                              value={skill.skillId}
                              placeholder={t("profile.skillIdPlaceholder") || "Tên kỹ năng"}
                              onChange={(event) => updateSkill(index, { skillId: event.target.value })}
                              className="h-9 rounded-lg border-slate-205 text-xs focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]/35"
                            />
                            <LevelSelector
                              value={skill.level}
                              onChange={(val) => updateSkill(index, { level: val })}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => removeSkill(index)}
                              className="h-9 w-9 p-0 text-slate-400 hover:text-red-505 hover:bg-red-55 rounded-lg transition-colors flex items-center justify-center"
                              aria-label={t("profile.removeSkill")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addSkill}
                          className="w-full rounded-xl border-dashed border-slate-200 text-slate-650 font-bold hover:bg-slate-50 transition-colors h-10 text-xs"
                        >
                          <Plus className="mr-1.5 h-4 w-4" />
                          {t("profile.addSkill")}
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <Button
                          type="button"
                          onClick={() => {
                            saveSkillsMutation.mutate();
                            setIsEditingSkills(false);
                          }}
                          disabled={saveSkillsMutation.isPending}
                          className="flex-1 rounded-xl bg-[#00AEEF] font-bold text-white hover:bg-[#049bd7] transition-all h-10 text-xs"
                        >
                          <Save className="mr-1.5 h-3.5 w-3.5" />
                          {saveSkillsMutation.isPending ? t("profile.saving") : t("profile.saveSkills")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setSkillsDraft(skillsQuery.data ?? []);
                            setIsEditingSkills(false);
                          }}
                          className="rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 h-10 text-xs px-3"
                        >
                          {t("profile.cancel")}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="rounded-3xl border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.01)] bg-white overflow-hidden">
              <CardHeader className="pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-poppins text-lg font-black text-slate-900">
                      {t("profile.accountInfo")}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {profileQuery.isLoading ? t("profile.loading") : t("profile.accountInfoDesc")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs value={activeAccountTab} onValueChange={setActiveAccountTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-50 p-1 rounded-2xl h-auto mb-6 border border-slate-100 md:grid-cols-4">
                    <TabsTrigger 
                      value="personal" 
                      className="rounded-xl font-bold py-2 transition-all text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-xs md:text-sm"
                    >
                      {t("profile.tabBasic")}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="career" 
                      className="rounded-xl font-bold py-2 transition-all text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-xs md:text-sm"
                    >
                      {t("profile.tabCareer")}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="socials" 
                      className="rounded-xl font-bold py-2 transition-all text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-xs md:text-sm"
                    >
                      {t("profile.tabSocials")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="billing"
                      className="rounded-xl font-bold py-2 transition-all text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-xs md:text-sm"
                    >
                      {t("profile.tabBilling")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="personal" className="space-y-5 outline-none mt-0">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="text-slate-700 font-bold text-xs">{t("profile.displayName")}</Label>
                        <div className="relative mt-2 group">
                          <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-405 group-focus-within:text-[#00AEEF] transition-colors" />
                          <Input
                            value={form.displayName}
                            onChange={(event) => updateField("displayName", event.target.value)}
                            className="h-11 rounded-xl pl-10 border-slate-200 focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]/35 transition-all text-slate-900 font-semibold text-xs"
                            placeholder={t("profile.placeholderDisplayName")}
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-slate-500 font-bold text-xs opacity-90">{t("profile.email")}</Label>
                        <div className="relative mt-2">
                          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input 
                            value={email} 
                            disabled 
                            className="h-11 rounded-xl pl-10 border-slate-100 bg-slate-50/70 text-slate-500 cursor-not-allowed font-semibold text-xs select-none" 
                          />
                          <Lock className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>

                      <div>
                        <Label className="text-slate-700 font-bold text-xs">{t("profile.university")}</Label>
                        <div className="relative mt-2 group">
                          <GraduationCap className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-450 group-focus-within:text-[#00AEEF] transition-colors" />
                          <Input
                            value={form.university}
                            onChange={(event) => updateField("university", event.target.value)}
                            className="h-11 rounded-xl pl-10 border-slate-200 focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]/35 transition-all text-slate-900 font-semibold text-xs"
                            placeholder={t("profile.placeholderUniversity")}
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-slate-700 font-bold text-xs">{t("profile.major")}</Label>
                        <div className="relative mt-2 group">
                          <BookOpen className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-450 group-focus-within:text-[#00AEEF] transition-colors" />
                          <Input
                            value={form.major}
                            onChange={(event) => updateField("major", event.target.value)}
                            className="h-11 rounded-xl pl-10 border-slate-200 focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]/35 transition-all text-slate-900 font-semibold text-xs"
                            placeholder={t("profile.placeholderMajor")}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="career" className="space-y-5 outline-none mt-0">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="text-slate-700 font-bold text-xs">{t("profile.experienceYears")}</Label>
                        <div className="relative mt-2 group">
                          <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-450 group-focus-within:text-[#00AEEF] transition-colors" />
                          <Input
                            type="number"
                            min={0}
                            value={form.experienceYears}
                            onChange={(event) => updateField("experienceYears", event.target.value)}
                            className="h-11 rounded-xl pl-10 border-slate-200 focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]/35 transition-all text-slate-900 font-semibold text-xs"
                            placeholder={t("profile.placeholderExpYears")}
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-slate-700 font-bold text-xs">{t("profile.targetJob")}</Label>
                        <div className="relative mt-2 group">
                          <Briefcase className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-450 group-focus-within:text-[#00AEEF] transition-colors" />
                          <Input
                            value={form.targetJob}
                            onChange={(event) => updateField("targetJob", event.target.value)}
                            className="h-11 rounded-xl pl-10 border-slate-200 focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]/35 transition-all text-slate-900 font-semibold text-xs"
                            placeholder={t("profile.placeholderTargetJob")}
                          />
                        </div>
                      </div>

                      <div className="col-span-1 sm:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-slate-700 font-bold text-xs">{t("profile.careerGoal")}</Label>
                          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wider">
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            {t("profile.aiDirection")}
                          </span>
                        </div>
                        <Textarea
                          value={form.careerGoal}
                          onChange={(event) => updateField("careerGoal", event.target.value)}
                          className="min-h-32 rounded-2xl border-slate-200 focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]/35 transition-all text-slate-900 font-semibold p-4 text-xs leading-relaxed"
                          placeholder={t("profile.placeholderCareerGoal")}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="socials" className="space-y-4 outline-none mt-0">
                    <div className="grid gap-4">
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-sm">
                            <Github className="h-5.5 w-5.5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-xs">GitHub URL</h4>
                            <p className="text-[10px] text-slate-500">{t("profile.descGithub")}</p>
                          </div>
                        </div>
                        <div className="w-full md:w-3/5 flex items-center gap-2">
                          <div className="relative flex-grow">
                            <Input
                              value={form.githubUrl}
                              onChange={(event) => updateField("githubUrl", event.target.value)}
                              className="h-10 rounded-xl border-slate-200 pr-9 focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]/35 text-xs font-semibold text-slate-950"
                              placeholder="https://github.com/username"
                            />
                            {form.githubUrl && form.githubUrl.startsWith("http") && (
                              <a
                                href={form.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 hover:text-[#00AEEF] transition-colors"
                              >
                                <ArrowUpRight className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-blue-700 flex items-center justify-center text-white shrink-0 shadow-sm">
                            <Linkedin className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-xs">LinkedIn URL</h4>
                            <p className="text-[10px] text-slate-500">{t("profile.descLinkedin")}</p>
                          </div>
                        </div>
                        <div className="w-full md:w-3/5 flex items-center gap-2">
                          <div className="relative flex-grow">
                            <Input
                              value={form.linkedinUrl}
                              onChange={(event) => updateField("linkedinUrl", event.target.value)}
                              className="h-10 rounded-xl border-slate-200 pr-9 focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]/35 text-xs font-semibold text-slate-955"
                              placeholder="https://linkedin.com/in/username"
                            />
                            {form.linkedinUrl && form.linkedinUrl.startsWith("http") && (
                              <a
                                href={form.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00AEEF] transition-colors"
                              >
                                <ArrowUpRight className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:bg-slate-55">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[#00AEEF] flex items-center justify-center text-white shrink-0 shadow-sm">
                            <Globe className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-xs">Portfolio URL</h4>
                            <p className="text-[10px] text-slate-500">{t("profile.descPortfolio")}</p>
                          </div>
                        </div>
                        <div className="w-full md:w-3/5 flex items-center gap-2">
                          <div className="relative flex-grow">
                            <Input
                              value={form.portfolioUrl}
                              onChange={(event) => updateField("portfolioUrl", event.target.value)}
                              className="h-10 rounded-xl border-slate-200 pr-9 focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF]/35 text-xs font-semibold text-slate-955"
                              placeholder="https://myportfolio.com"
                            />
                            {form.portfolioUrl && form.portfolioUrl.startsWith("http") && (
                              <a
                                href={form.portfolioUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00AEEF] transition-colors"
                              >
                                <ArrowUpRight className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="billing" className="outline-none mt-0">
                    <BillingProfilePanel
                      subscription={billingSubscription}
                      features={billingFeatures}
                      isLoading={billingSubscriptionQuery.isLoading || billingUsageQuery.isLoading}
                      t={t}
                    />
                  </TabsContent>
                </Tabs>

                <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-slate-100">
                  {activeAccountTab !== "billing" && (
                    <Button
                      type="button"
                      onClick={() => saveProfileMutation.mutate()}
                      disabled={saveProfileMutation.isPending}
                      className="h-11 rounded-xl bg-[#00AEEF] px-6 font-bold text-white hover:bg-[#049bd7] transition-all text-xs"
                    >
                      <Save className="mr-1.5 h-4 w-4" />
                      {saveProfileMutation.isPending ? t("profile.saving") : t("profile.saveProfile")}
                    </Button>
                  )}
                  <Button asChild variant="outline" className="h-11 rounded-xl px-6 border-slate-200 hover:bg-slate-55 transition-all text-xs">
                    <Link to="/dashboard">
                      <ShieldCheck className="mr-1.5 h-4 w-4 text-[#00AEEF]" />
                      {t("profile.goDashboard")}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
