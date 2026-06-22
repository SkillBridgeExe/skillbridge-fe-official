import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Linkedin, Loader2, Phone, Plus, Search, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { MentorStatusBadge } from "@/components/mentor/MentorStatusBadge";
import { MentorAvatarEditor } from "@/components/mentor/MentorAvatarEditor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useMentorSkills,
  useMyMentorProfile,
  useSubmitMyMentorProfile,
  useUpdateMyMentorProfile,
} from "@/hooks/use-mentors";
import { getApiErrorMessage } from "@/lib/api-error";
import { getMentorProfileCompletion, isMentorProfileReadOnly } from "@/lib/mentor-marketplace";
import {
  MENTOR_SESSION_DURATIONS,
  type MentorProfileDto,
  type SkillPickerItemDto,
} from "@/services/mentor.service";

const profileSchema = z.object({
  headline: z.string().trim().max(160),
  company: z.string().trim().max(120),
  shortBio: z.string().trim().max(280),
  bio: z.string().trim().max(3000),
  linkedinUrl: z
    .string()
    .trim()
    .max(300)
    .refine(
      (value) => !value || /^https:\/\/(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com\/in\/[a-z0-9_-]+\/?(?:\?.*)?$/i.test(value),
      "Enter a valid HTTPS LinkedIn profile URL.",
    ),
  phoneNumber: z
    .string()
    .trim()
    .max(32)
    .refine(
      (value) => !value || /^\+?[0-9][0-9\s().-]{7,30}$/.test(value),
      "Enter a valid phone number.",
    ),
  domains: z.array(z.string().trim().min(1).max(80)).max(5),
  skillIds: z.array(z.string().uuid()).max(8),
  sessionPriceVnd: z.number().int().min(50000).max(10000000),
  sessionDurationMinutes: z.number().refine((value) => MENTOR_SESSION_DURATIONS.includes(value as never)),
  isAcceptingBookings: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const EMPTY_VALUES: ProfileFormValues = {
  headline: "",
  company: "",
  shortBio: "",
  bio: "",
  linkedinUrl: "",
  phoneNumber: "",
  domains: [],
  skillIds: [],
  sessionPriceVnd: 50000,
  sessionDurationMinutes: 60,
  isAcceptingBookings: true,
};

export default function MentorProfileSetup() {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const profileQuery = useMyMentorProfile();
  const updateMutation = useUpdateMyMentorProfile();
  const submitMutation = useSubmitMyMentorProfile();
  const [domainInput, setDomainInput] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<SkillPickerItemDto[]>([]);
  const skillsQuery = useMentorSkills({ query: skillSearch.trim() || undefined, limit: 8 });
  const form = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema), defaultValues: EMPTY_VALUES });
  const profile = profileQuery.data;
  const readOnly = profile ? isMentorProfileReadOnly(profile.status) : false;
  const domains = form.watch("domains");

  useEffect(() => {
    if (!profile) {
      form.reset(EMPTY_VALUES);
      setSelectedSkills([]);
      return;
    }
    form.reset(toFormValues(profile));
    setSelectedSkills(profile.skills.map((skill) => ({ id: skill.id, canonicalName: skill.displayName, displayName: skill.displayName, category: skill.category })));
  }, [form, profile]);

  const save = form.handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync({
        headline: values.headline || null,
        company: values.company || null,
        shortBio: values.shortBio || null,
        bio: values.bio || null,
        linkedinUrl: values.linkedinUrl || null,
        phoneNumber: values.phoneNumber || null,
        domainTags: values.domains,
        skillIds: values.skillIds,
        sessionPriceVnd: values.sessionPriceVnd,
        sessionDurationMinutes: values.sessionDurationMinutes,
        isAcceptingBookings: values.isAcceptingBookings,
      });
      toast({ title: t("mentor.dashboard.saved") });
    } catch (error) {
      toast({ title: t("mentor.marketplace.loadErrorTitle"), description: getApiErrorMessage(error), variant: "destructive" });
    }
  });

  const submitForReview = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    try {
      const values = form.getValues();
      if (!hasVerificationContact(values)) {
        const message = t("mentor.dashboard.verificationContactRequired");
        form.setError("linkedinUrl", { type: "manual", message });
        form.setError("phoneNumber", { type: "manual", message });
        return;
      }
      const saved = await updateMutation.mutateAsync({
        headline: values.headline || null,
        company: values.company || null,
        shortBio: values.shortBio || null,
        bio: values.bio || null,
        linkedinUrl: values.linkedinUrl || null,
        phoneNumber: values.phoneNumber || null,
        domainTags: values.domains,
        skillIds: values.skillIds,
        sessionPriceVnd: values.sessionPriceVnd,
        sessionDurationMinutes: values.sessionDurationMinutes,
        isAcceptingBookings: values.isAcceptingBookings,
      });
      if (getMentorProfileCompletion(saved).percentage < 100) {
        toast({ title: t("mentor.dashboard.missingFields"), variant: "destructive" });
        return;
      }
      await submitMutation.mutateAsync();
      toast({ title: t("mentor.dashboard.submitted") });
    } catch (error) {
      toast({ title: t("mentor.marketplace.loadErrorTitle"), description: getApiErrorMessage(error), variant: "destructive" });
    }
  };

  const addDomain = () => {
    const value = domainInput.trim();
    if (!value || domains.includes(value) || domains.length >= 5) return;
    form.setValue("domains", [...domains, value], { shouldDirty: true, shouldValidate: true });
    setDomainInput("");
  };

  const addSkill = (skill: SkillPickerItemDto) => {
    if (selectedSkills.some((item) => item.id === skill.id) || selectedSkills.length >= 8) return;
    const next = [...selectedSkills, skill];
    setSelectedSkills(next);
    form.setValue("skillIds", next.map((item) => item.id), { shouldDirty: true, shouldValidate: true });
    setSkillSearch("");
  };

  const removeSkill = (skillId: string) => {
    const next = selectedSkills.filter((item) => item.id !== skillId);
    setSelectedSkills(next);
    form.setValue("skillIds", next.map((item) => item.id), { shouldDirty: true, shouldValidate: true });
  };

  if (profileQuery.isLoading) return <Skeleton className="h-[720px] rounded-2xl" />;
  if (profileQuery.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center dark:border-rose-900 dark:bg-slate-950">
        <p className="font-bold text-slate-900 dark:text-white">
          {t("mentor.marketplace.loadErrorTitle")}
        </p>
        <Button type="button" onClick={() => void profileQuery.refetch()} className="mt-5 rounded-xl">
          {t("mentor.marketplace.retry")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">{t("mentor.dashboard.title")}</h1>
            {profile ? <MentorStatusBadge status={profile.status} /> : null}
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{t("mentor.dashboard.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="outline" disabled={readOnly || updateMutation.isPending} className="h-11 rounded-xl border-slate-200 font-bold dark:border-slate-800">
            {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{updateMutation.isPending ? t("mentor.dashboard.saving") : t("mentor.dashboard.save")}
          </Button>
          {(!profile || profile.status === "DRAFT" || profile.status === "REJECTED") ? (
            <Button type="button" onClick={() => void submitForReview()} disabled={submitMutation.isPending || updateMutation.isPending} className="h-11 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90">
              {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}{submitMutation.isPending ? t("mentor.dashboard.submitting") : t("mentor.dashboard.submit")}
            </Button>
          ) : null}
        </div>
      </header>

      {readOnly && profile ? <Alert className="rounded-2xl border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"><AlertTitle>{t(`mentor.status.${profile.status}`)}</AlertTitle><AlertDescription>{profile.status === "PENDING_REVIEW" ? t("mentor.dashboard.pendingBody") : t("mentor.dashboard.suspendedBody")}</AlertDescription></Alert> : null}
      {profile?.status === "REJECTED" && profile.rejectionReason ? <Alert variant="destructive" className="rounded-2xl"><AlertTitle>{t("mentor.dashboard.rejectionReason")}</AlertTitle><AlertDescription>{profile.rejectionReason}</AlertDescription></Alert> : null}

      <fieldset disabled={readOnly} className="space-y-6 disabled:opacity-70">
        <FormSection title={t("mentor.dashboard.basicInfo")}>
          <MentorAvatarEditor
            avatarUrl={profile?.avatarUrl}
            displayName={profile?.displayName ?? t("mentor.dashboard.emptyTitle")}
            disabled={readOnly}
          />
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label={t("mentor.dashboard.headline")} error={form.formState.errors.headline?.message}><Input {...form.register("headline")} maxLength={160} className="h-11 rounded-xl" /></Field>
            <Field label={t("mentor.dashboard.company")} error={form.formState.errors.company?.message}><Input {...form.register("company")} maxLength={120} className="h-11 rounded-xl" /></Field>
            <Field label={t("mentor.dashboard.shortBio")} error={form.formState.errors.shortBio?.message} className="md:col-span-2"><Textarea {...form.register("shortBio")} maxLength={280} rows={3} className="rounded-xl" /></Field>
            <Field label={t("mentor.dashboard.fullBio")} error={form.formState.errors.bio?.message} className="md:col-span-2"><Textarea {...form.register("bio")} maxLength={3000} rows={7} className="rounded-xl" /></Field>
          </div>
        </FormSection>

        <FormSection title={t("mentor.dashboard.verificationContact")}>
          <p className="mb-5 text-sm leading-6 text-muted-foreground">
            {t("mentor.dashboard.verificationContactHint")}
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={t("mentor.dashboard.linkedinUrl")} error={form.formState.errors.linkedinUrl?.message}>
              <div className="relative">
                <Linkedin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <Input {...form.register("linkedinUrl")} maxLength={300} placeholder="https://www.linkedin.com/in/username" className="h-11 rounded-xl pl-10" />
              </div>
            </Field>
            <Field label={t("mentor.dashboard.phoneNumber")} error={form.formState.errors.phoneNumber?.message}>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <Input {...form.register("phoneNumber")} maxLength={32} placeholder="+84 912 345 678" className="h-11 rounded-xl pl-10" />
              </div>
            </Field>
          </div>
          <p className="mt-4 text-xs font-medium text-muted-foreground">
            {t("mentor.dashboard.phonePrivacy")}
          </p>
        </FormSection>

        <FormSection title={t("mentor.dashboard.domains")}>
          <div className="flex gap-2"><Input value={domainInput} onChange={(event) => setDomainInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addDomain(); } }} placeholder={t("mentor.dashboard.domainPlaceholder")} className="h-11 rounded-xl" /><Button type="button" variant="outline" onClick={addDomain} className="h-11 rounded-xl"><Plus className="h-4 w-4" /></Button></div>
          <div className="mt-3 flex flex-wrap gap-2">{domains.map((domain) => <Badge key={domain} variant="secondary" className="rounded-full px-3 py-1.5">{domain}<button type="button" onClick={() => form.setValue("domains", domains.filter((item) => item !== domain), { shouldDirty: true })} className="ml-2"><X className="h-3.5 w-3.5" /></button></Badge>)}</div>
        </FormSection>

        <FormSection title={t("mentor.dashboard.skills")}>
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={skillSearch} onChange={(event) => setSkillSearch(event.target.value)} placeholder={t("mentor.dashboard.skillPlaceholder")} className="h-11 rounded-xl pl-10" /></div>
          {skillSearch || skillsQuery.data?.length ? <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">{skillsQuery.data?.filter((skill) => !selectedSkills.some((item) => item.id === skill.id)).map((skill) => <button key={skill.id} type="button" onClick={() => addSkill(skill)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-900"><span className="font-semibold text-slate-800 dark:text-slate-100">{skill.displayName}</span><span className="text-xs text-slate-400">{skill.category}</span></button>)}</div> : null}
          <div className="mt-3 flex flex-wrap gap-2">{selectedSkills.map((skill) => <Badge key={skill.id} className="rounded-full border-0 bg-primary/10 px-3 py-1.5 text-primary hover:bg-primary/10">{skill.displayName}<button type="button" onClick={() => removeSkill(skill.id)} className="ml-2"><X className="h-3.5 w-3.5" /></button></Badge>)}</div>
        </FormSection>

        <FormSection title={t("mentor.dashboard.session")}>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={t("mentor.dashboard.price")} error={form.formState.errors.sessionPriceVnd?.message}><Input type="number" step={50000} {...form.register("sessionPriceVnd", { valueAsNumber: true })} className="h-11 rounded-xl" /></Field>
            <Field label={t("mentor.dashboard.duration")} error={form.formState.errors.sessionDurationMinutes?.message}><Controller control={form.control} name="sessionDurationMinutes" render={({ field }) => <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{MENTOR_SESSION_DURATIONS.map((duration) => <SelectItem key={duration} value={String(duration)}>{t("mentor.card.perSession", { minutes: duration })}</SelectItem>)}</SelectContent></Select>} /></Field>
          </div>
          <Controller control={form.control} name="isAcceptingBookings" render={({ field }) => <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800"><div><Label className="font-bold">{t("mentor.dashboard.accepting")}</Label><p className="mt-1 text-xs text-slate-500">{field.value ? t("mentor.profile.accepting") : t("mentor.profile.unavailable")}</p></div><Switch checked={field.value} onCheckedChange={field.onChange} /></div>} />
        </FormSection>
      </fieldset>
    </form>
  );
}

function toFormValues(profile: MentorProfileDto): ProfileFormValues {
  return { headline: profile.headline ?? "", company: profile.company ?? "", shortBio: profile.shortBio ?? "", bio: profile.bio ?? "", linkedinUrl: profile.linkedinUrl ?? "", phoneNumber: profile.phoneNumber ?? "", domains: profile.domains, skillIds: profile.skills.map((skill) => skill.id), sessionPriceVnd: profile.sessionPriceVnd, sessionDurationMinutes: profile.sessionDurationMinutes, isAcceptingBookings: profile.isAcceptingBookings };
}

function hasVerificationContact(values: ProfileFormValues): boolean {
  return Boolean(values.linkedinUrl.trim() || values.phoneNumber.trim());
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"><h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">{title}</h2><div className="mt-5">{children}</div></section>;
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return <div className={className}><Label className="mb-2 block font-bold text-slate-700 dark:text-slate-200">{label}</Label>{children}{error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : null}</div>;
}
