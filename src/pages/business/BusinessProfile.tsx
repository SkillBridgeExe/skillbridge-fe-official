import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Image,
  Loader2,
  Mail,
  Save,
  Send,
  Upload,
} from "lucide-react";
import BusinessLayout from "./BusinessLayout";
import {
  useBusinessCompanyMediaQuery,
  useBusinessCompanyQuery,
  useSendWorkEmailVerificationMutation,
  useSubmitBusinessProfileMutation,
  useUpdateBusinessCompanyMutation,
  useUploadCompanyMediaMutation,
} from "@/hooks/use-business-company";
import { useBlobUrl } from "@/hooks/use-blob-url";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import type { CompanySize, UpdateBusinessCompanyRequest } from "@/types/jobs";

const COMPANY_SIZES: Array<{ label: string; value: CompanySize }> = [
  { label: "1-10 employees", value: "1_10" },
  { label: "11-50 employees", value: "11_50" },
  { label: "51-100 employees", value: "51_100" },
  { label: "101-300 employees", value: "101_300" },
  { label: "301-500 employees", value: "301_500" },
  { label: "501-1000 employees", value: "501_1000" },
  { label: "1000+ employees", value: "1000_PLUS" },
];

const INDUSTRIES = [
  "Information Technology",
  "Finance & Banking",
  "E-Commerce",
  "Education",
  "Healthcare",
  "Manufacturing",
  "Retail",
  "Logistics",
  "Marketing",
  "Other",
];

const MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500";

type CompanyForm = {
  companyName: string;
  industryCode: string;
  companySize: CompanySize | "";
  website: string;
  headquartersAddress: string;
  contactName: string;
  contactPhone: string;
  workEmail: string;
  shortDescription: string;
  description: string;
};

const EMPTY_FORM: CompanyForm = {
  companyName: "",
  industryCode: "",
  companySize: "",
  website: "",
  headquartersAddress: "",
  contactName: "",
  contactPhone: "",
  workEmail: "",
  shortDescription: "",
  description: "",
};

function companyForm(
  aggregate: ReturnType<typeof useBusinessCompanyQuery>["data"],
): CompanyForm {
  if (!aggregate) return EMPTY_FORM;
  return {
    companyName: aggregate.company.name ?? "",
    industryCode: aggregate.company.industryCode ?? "",
    companySize: aggregate.company.companySize ?? "",
    website: aggregate.company.website ?? "",
    headquartersAddress: aggregate.company.headquartersAddress ?? "",
    contactName: aggregate.profile.contactName ?? "",
    contactPhone: aggregate.profile.contactPhone ?? "",
    workEmail: aggregate.profile.workEmail ?? "",
    shortDescription: aggregate.company.shortDescription ?? "",
    description: aggregate.company.description ?? "",
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toUpdateRequest(form: CompanyForm): UpdateBusinessCompanyRequest {
  return {
    companyName: form.companyName.trim(),
    industryCode: nullable(form.industryCode),
    companySize: form.companySize || null,
    website: nullable(form.website),
    headquartersAddress: nullable(form.headquartersAddress),
    contactName: nullable(form.contactName),
    contactPhone: nullable(form.contactPhone),
    workEmail: nullable(form.workEmail),
    shortDescription: nullable(form.shortDescription),
    description: nullable(form.description),
  };
}

export default function BusinessProfile() {
  const { toast } = useToast();
  const companyQuery = useBusinessCompanyQuery();
  const updateCompany = useUpdateBusinessCompanyMutation();
  const submitProfile = useSubmitBusinessProfileMutation();
  const sendVerification = useSendWorkEmailVerificationMutation();
  const uploadMedia = useUploadCompanyMediaMutation();
  const [form, setForm] = useState<CompanyForm>(EMPTY_FORM);

  const aggregate = companyQuery.data;
  const profile = aggregate?.profile;
  const company = aggregate?.company;
  const status = profile?.status ?? "DRAFT";
  const isReadOnly = status === "PENDING_REVIEW" || status === "SUSPENDED";
  const logoQuery = useBusinessCompanyMediaQuery("logo", Boolean(company?.logoUrl));
  const coverQuery = useBusinessCompanyMediaQuery("cover", Boolean(company?.coverUrl));
  const logoUrl = useBlobUrl(logoQuery.data);
  const coverUrl = useBlobUrl(coverQuery.data);
  const savedForm = useMemo(() => companyForm(aggregate), [aggregate]);
  const isDirty = (Object.keys(form) as Array<keyof CompanyForm>).some(
    (key) => form[key] !== savedForm[key],
  );

  useEffect(() => {
    setForm(savedForm);
  }, [savedForm]);

  const requiredComplete = useMemo(
    () =>
      [
        form.companyName,
        form.industryCode,
        form.website,
        form.contactName,
        form.workEmail,
        form.shortDescription,
      ].every((value) => value.trim().length > 0),
    [form],
  );
  const canSubmit =
    requiredComplete && Boolean(profile?.workEmailVerifiedAt) && !isReadOnly && !isDirty;

  const setField = <K extends keyof CompanyForm>(field: K, value: CompanyForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) {
      toast({ variant: "destructive", title: "Company name is required" });
      return;
    }
    try {
      await updateCompany.mutateAsync(toUpdateRequest(form));
      toast({ title: "Draft saved", description: "Company information has been updated." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: getApiErrorMessage(error, "Could not update the company profile."),
      });
    }
  };

  const handleSendVerification = async () => {
    try {
      await sendVerification.mutateAsync();
      toast({
        title: "Verification email sent",
        description: "Open the link in your work inbox. The link works without an active session.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not send verification",
        description: getApiErrorMessage(error),
      });
    }
  };

  const handleSubmit = async () => {
    try {
      await submitProfile.mutateAsync();
      toast({ title: "Submitted for review" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Submit failed",
        description: getApiErrorMessage(error),
      });
    }
  };

  const handleMedia = async (kind: "logo" | "cover", file: File | undefined) => {
    if (!file) return;
    if (!MEDIA_TYPES.has(file.type) || file.size > MEDIA_MAX_BYTES) {
      toast({
        variant: "destructive",
        title: "Invalid image",
        description: "Use PNG, JPEG, or WEBP up to 5 MB.",
      });
      return;
    }
    if (!aggregate) {
      toast({ title: "Save the company draft before uploading media." });
      return;
    }
    try {
      await uploadMedia.mutateAsync({ kind, file });
      toast({ title: `${kind === "logo" ? "Logo" : "Cover"} uploaded` });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: getApiErrorMessage(error),
      });
    }
  };

  if (companyQuery.isLoading) {
    return (
      <BusinessLayout title="Company Profile" subtitle="Loading your profile...">
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout
      title="Company Profile"
      subtitle="Keep your company identity clear and consistent for applicants."
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <ProfileStatus status={status} reason={profile?.rejectionReason ?? profile?.suspensionReason} />

        {status === "VERIFIED" ? (
          <Notice>
            You can edit this verified profile. Changing the company name, website, or work email
            sends the identity back to draft review; content and media updates keep verification.
          </Notice>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <MediaCard
            title="Company logo"
            kind="logo"
            imageUrl={logoUrl}
            disabled={isReadOnly || uploadMedia.isPending}
            onFile={(file) => void handleMedia("logo", file)}
          />
          <MediaCard
            title="Company cover"
            kind="cover"
            imageUrl={coverUrl}
            disabled={isReadOnly || uploadMedia.isPending}
            onFile={(file) => void handleMedia("cover", file)}
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-bold text-slate-950">Company information</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Company name *">
              <input
                value={form.companyName}
                disabled={isReadOnly}
                onChange={(event) => setField("companyName", event.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Industry *">
              <select
                value={form.industryCode}
                disabled={isReadOnly}
                onChange={(event) => setField("industryCode", event.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry}>{industry}</option>
                ))}
              </select>
            </Field>
            <Field label="Company size">
              <select
                value={form.companySize}
                disabled={isReadOnly}
                onChange={(event) => setField("companySize", event.target.value as CompanySize | "")}
                className={INPUT_CLASS}
              >
                <option value="">Select size</option>
                {COMPANY_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Website *">
              <input
                type="url"
                value={form.website}
                disabled={isReadOnly}
                onChange={(event) => setField("website", event.target.value)}
                className={INPUT_CLASS}
                placeholder="https://company.vn"
              />
            </Field>
            <Field label="Contact name *">
              <input
                value={form.contactName}
                disabled={isReadOnly}
                onChange={(event) => setField("contactName", event.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Contact phone">
              <input
                value={form.contactPhone}
                disabled={isReadOnly}
                onChange={(event) => setField("contactPhone", event.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Headquarters" className="sm:col-span-2">
              <input
                value={form.headquartersAddress}
                disabled={isReadOnly}
                onChange={(event) => setField("headquartersAddress", event.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Short description *" className="sm:col-span-2">
              <textarea
                value={form.shortDescription}
                disabled={isReadOnly}
                maxLength={500}
                onChange={(event) => setField("shortDescription", event.target.value)}
                className={`${INPUT_CLASS} min-h-24 resize-y py-3`}
              />
            </Field>
            <Field label="Full description" className="sm:col-span-2">
              <textarea
                value={form.description}
                disabled={isReadOnly}
                onChange={(event) => setField("description", event.target.value)}
                className={`${INPUT_CLASS} min-h-36 resize-y py-3`}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-950">Work email verification</h2>
              <p className="mt-1 text-sm text-slate-500">
                The email domain must match the company website.
              </p>
            </div>
            {profile?.workEmailVerifiedAt ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Verified
              </span>
            ) : null}
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={form.workEmail}
                disabled={isReadOnly}
                onChange={(event) => setField("workEmail", event.target.value)}
                className={`${INPUT_CLASS} pl-11`}
                placeholder="hr@company.vn"
              />
            </div>
            <button
              type="button"
              disabled={!aggregate || isReadOnly || isDirty || sendVerification.isPending}
              onClick={() => void handleSendVerification()}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-700 disabled:opacity-50"
            >
              {sendVerification.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send verification
            </button>
          </div>
          {!profile?.workEmailVerifiedAt ? (
            <p className="mt-3 text-xs text-amber-700">
              Save all profile changes before requesting a verification link.
            </p>
          ) : null}
        </section>

        {!isReadOnly ? (
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!isDirty || updateCompany.isPending}
              className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 disabled:opacity-50"
            >
              {updateCompany.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save draft
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit || submitProfile.isPending}
              className="inline-flex h-11 items-center rounded-xl bg-sky-600 px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitProfile.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit for review
            </button>
          </div>
        ) : null}
      </div>
    </BusinessLayout>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function MediaCard({
  title,
  kind,
  imageUrl,
  disabled,
  onFile,
}: {
  title: string;
  kind: "logo" | "cover";
  imageUrl: string | null;
  disabled: boolean;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-bold text-slate-950">{title}</h2>
      <div
        className={`mt-4 overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50 ${
          kind === "logo" ? "h-32" : "h-40"
        }`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            {kind === "logo" ? <Building2 size={36} /> : <Image size={36} />}
          </div>
        )}
      </div>
      <label className="mt-4 inline-flex cursor-pointer items-center rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700">
        <Upload className="mr-2 h-4 w-4" />
        Upload {kind}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled}
          className="hidden"
          onChange={(event) => {
            onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      <p className="mt-2 text-xs text-slate-400">PNG, JPEG, or WEBP up to 5 MB.</p>
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

function ProfileStatus({ status, reason }: { status: string; reason?: string | null }) {
  if (status === "DRAFT") return null;
  const styles =
    status === "VERIFIED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "REJECTED" || status === "SUSPENDED"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <div className={`rounded-2xl border p-4 text-sm ${styles}`}>
      <strong>{status.replace(/_/g, " ")}</strong>
      {reason ? <p className="mt-1">{reason}</p> : null}
    </div>
  );
}
