import { useEffect, useMemo, useState } from "react";
import BusinessLayout from "./BusinessLayout";
import {
  Building2,
  Globe,
  MapPin,
  Phone,
  Mail,
  Upload,
  Save,
  CheckCircle,
  AlertCircle,
  Send,
  Loader2,
} from "lucide-react";
import {
  useBusinessCompanyQuery,
  useUpdateBusinessCompanyMutation,
  useSubmitBusinessProfileMutation,
  useUploadCompanyMediaMutation,
} from "@/hooks/use-business-company";
import type { CompanySize } from "@/types/jobs";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";

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

const COMPANY_SIZES = [
  { label: "1-10 employees", value: "1_10" },
  { label: "11-50 employees", value: "11_50" },
  { label: "51-100 employees", value: "51_100" },
  { label: "101-300 employees", value: "101_300" },
  { label: "301-500 employees", value: "301_500" },
  { label: "501-1000 employees", value: "501_1000" },
  { label: "1000+ employees", value: "1000_PLUS" },
];

export default function BusinessProfile() {
  const { toast } = useToast();
  const { data: aggregate, isLoading, isError } = useBusinessCompanyQuery();
  const updateMutation = useUpdateBusinessCompanyMutation();
  const submitMutation = useSubmitBusinessProfileMutation();
  const uploadMutation = useUploadCompanyMediaMutation();

  const [form, setForm] = useState<{
    companyName: string;
    industryCode: string;
    companySize: CompanySize | "";
    website: string;
    headquartersAddress: string;
    contactPhone: string;
    workEmail: string;
    description: string;
  }>({
    companyName: "",
    industryCode: "",
    companySize: "",
    website: "",
    headquartersAddress: "",
    contactPhone: "",
    workEmail: "",
    description: "",
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Initialize form from API
  useEffect(() => {
    if (aggregate?.company) {
      const c = aggregate.company;
      const p = aggregate.profile;
      setForm({
        companyName: c.name || "",
        industryCode: c.industryCode || "",
        companySize: c.companySize || "",
        website: c.website || "",
        headquartersAddress: c.headquartersAddress || "",
        contactPhone: p.contactPhone || "",
        workEmail: p.workEmail || "",
        description: c.description || "",
      });
    }
  }, [aggregate]);

  const completion = useMemo(() => {
    const fields = [
      form.companyName,
      form.industryCode,
      form.companySize,
      form.website,
      form.headquartersAddress,
      form.workEmail,
      form.description,
    ];
    const filled = fields.filter((value) => value && value.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [form]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(
      {
        companyName: form.companyName,
        industryCode: form.industryCode,
        companySize: form.companySize || undefined,
        website: form.website,
        headquartersAddress: form.headquartersAddress,
        contactPhone: form.contactPhone,
        workEmail: form.workEmail,
        description: form.description,
      },
      {
        onSuccess: () => {
          toast({ title: "Draft saved", description: "Your company profile has been updated." });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Save failed",
            description: getApiErrorMessage(error, "Could not update the company profile."),
          });
        },
      },
    );
  };

  const handleSubmitReview = () => {
    if (window.confirm("Submit profile for review? You will not be able to edit during review.")) {
      submitMutation.mutate(undefined, {
        onSuccess: () => {
          toast({ title: "Submitted for review", description: "Admins can now verify your company profile." });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Submit failed",
            description: getApiErrorMessage(error, "Could not submit this profile for review."),
          });
        },
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      await uploadMutation.mutateAsync({ kind: "logo", file });
      toast({ title: "Logo uploaded", description: "Your public company profile preview has been refreshed." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: getApiErrorMessage(error, "Could not upload the company logo."),
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  if (isLoading) {
    return (
      <BusinessLayout title="Company Profile" subtitle="Loading your profile...">
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      </BusinessLayout>
    );
  }

  if (isError) {
    return (
      <BusinessLayout title="Company Profile" subtitle="Error loading profile">
        <div className="bg-red-50 text-red-600 p-5 rounded-xl border border-red-100 flex items-center gap-3">
          <AlertCircle size={20} />
          Failed to load business profile. Please refresh the page.
        </div>
      </BusinessLayout>
    );
  }

  const profile = aggregate?.profile;
  const company = aggregate?.company;
  const status = profile?.status || "DRAFT";
  const isReadOnly = status === "PENDING_REVIEW" || status === "VERIFIED";

  return (
    <BusinessLayout
      title="Company Profile"
      subtitle="Keep your company identity clear and consistent for applicants."
    >
      <div className="grid grid-cols-1 xl:grid-cols-[1.8fr_1fr] gap-6">
        <div className="space-y-5">
          {status === "PENDING_REVIEW" && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 flex items-start gap-4">
              <Loader2 className="animate-spin text-amber-500 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-amber-900">Profile Under Review</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Your profile is currently being reviewed by administrators. Editing is disabled until the review is complete.
                </p>
              </div>
            </div>
          )}

          {status === "VERIFIED" && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 flex items-start gap-4">
              <CheckCircle className="text-emerald-500 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-emerald-900">Profile Verified</h3>
                <p className="text-sm text-emerald-700 mt-1">
                  Your company profile is verified and visible to candidates.
                </p>
              </div>
            </div>
          )}

          {status === "REJECTED" && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-5 flex items-start gap-4">
              <AlertCircle className="text-red-500 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-red-900">Profile Rejected</h3>
                <p className="text-sm text-red-700 mt-1">
                  {profile?.rejectionReason || "Please update your information and resubmit."}
                </p>
              </div>
            </div>
          )}

          {/* Logo upload */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Company Logo</h2>
            <p className="text-xs text-slate-500">A clear logo improves trust and recognition.</p>
            <div className="flex items-center gap-5 mt-4">
              <div className="w-20 h-20 rounded-xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                {company?.logoObjectKey ? (
                  <img src={company.logoObjectKey} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 size={28} className="text-slate-300" />
                )}
              </div>
              <div>
                <label className={`cursor-pointer inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
                  isReadOnly || uploadingLogo ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200"
                }`}>
                  {uploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  <input type="file" accept="image/*" className="hidden" disabled={isReadOnly || uploadingLogo} onChange={handleLogoUpload} />
                </label>
                <p className="text-xs text-slate-400 mt-2">PNG or JPG, max 2MB. Recommended 200x200</p>
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. TechViet Co., Ltd."
                  value={form.companyName}
                  disabled={isReadOnly}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Industry</label>
                  <select
                    value={form.industryCode}
                    disabled={isReadOnly}
                    onChange={(e) => handleChange("industryCode", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all bg-white disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Company Size</label>
                  <select
                    value={form.companySize}
                    disabled={isReadOnly}
                    onChange={(e) => handleChange("companySize", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all bg-white disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="">Number of employees</option>
                    {COMPANY_SIZES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Company Description</label>
                <textarea
                  rows={4}
                  placeholder="Brief introduction about your company, culture, products or services..."
                  value={form.description}
                  disabled={isReadOnly}
                  onChange={(e) => handleChange("description", e.target.value.slice(0, 500))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all resize-none disabled:bg-slate-50 disabled:text-slate-500"
                />
                <p className="text-xs text-slate-400 mt-1">{form.description.length}/500 characters</p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  <Globe size={14} className="inline mr-1" />
                  Website
                </label>
                <input
                  type="url"
                  placeholder="https://techviet.com"
                  value={form.website}
                  disabled={isReadOnly}
                  onChange={(e) => handleChange("website", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    <Phone size={14} className="inline mr-1" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+84 901 234 567"
                    value={form.contactPhone}
                    disabled={isReadOnly}
                    onChange={(e) => handleChange("contactPhone", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    <Mail size={14} className="inline mr-1" />
                    Work Email
                  </label>
                  <input
                    type="email"
                    placeholder="hr@techviet.com"
                    value={form.workEmail}
                    disabled={isReadOnly}
                    onChange={(e) => handleChange("workEmail", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  <MapPin size={14} className="inline mr-1" />
                  Headquarters Address
                </label>
                <input
                  type="text"
                  placeholder="123 Tech Street, District 7, Ho Chi Minh City"
                  value={form.headquartersAddress}
                  disabled={isReadOnly}
                  onChange={(e) => handleChange("headquartersAddress", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {!isReadOnly && (
            <div className="flex justify-end gap-3">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Draft
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submitMutation.isPending || completion < 100}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-sky-500 hover:bg-sky-600 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title={completion < 100 ? "Complete profile to submit" : ""}
              >
                {submitMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Submit for Review
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900">Profile Completion</h3>
            <div className="h-2 mt-3 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${completion}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-2">{completion}% completed</p>

            <div className="mt-4 space-y-2 text-xs text-slate-600">
              <p className="flex items-center gap-2">
                <CheckCircle size={14} className={form.companyName ? "text-emerald-500" : "text-slate-300"} />
                Company Name
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle size={14} className={form.description ? "text-emerald-500" : "text-slate-300"} />
                Company Description
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle size={14} className={form.website ? "text-emerald-500" : "text-slate-300"} />
                Website
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle size={14} className={form.workEmail ? "text-emerald-500" : "text-slate-300"} />
                Work Email
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-cyan-50 rounded-xl border border-sky-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900">Public Preview</h3>
            <div className="mt-3 bg-white rounded-lg border border-sky-100 p-4">
              <p className="text-sm font-semibold text-slate-900">{form.companyName || "Your Company Name"}</p>
              <p className="text-xs text-slate-500 mt-1">{form.industryCode || "Industry"}</p>
              <p className="text-xs text-slate-500 mt-2 line-clamp-3">
                {form.description || "Your company description will appear here for candidates."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}
