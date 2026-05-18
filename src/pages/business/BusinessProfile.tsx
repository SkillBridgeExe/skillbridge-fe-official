import { useMemo, useState } from "react";
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
} from "lucide-react";

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

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

export default function BusinessProfile() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: "",
    industry: "",
    size: "",
    website: "",
    address: "",
    phone: "",
    email: "",
    description: "",
  });

  const completion = useMemo(() => {
    const fields = [
      form.name,
      form.industry,
      form.size,
      form.website,
      form.address,
      form.email,
      form.description,
    ];
    const filled = fields.filter((value) => value.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [form]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <BusinessLayout
      title="Company Profile"
      subtitle="Keep your company identity clear and consistent for applicants."
    >
      <div className="grid grid-cols-1 xl:grid-cols-[1.8fr_1fr] gap-6">
        <div className="space-y-5">
          {/* Logo upload */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Company Logo</h2>
            <p className="text-xs text-slate-500">A clear logo improves trust and recognition.</p>
            <div className="flex items-center gap-5 mt-4">
              <div className="w-20 h-20 rounded-xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center">
                <Building2 size={28} className="text-slate-300" />
              </div>
              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-sm font-medium px-4 py-2 rounded-lg border border-sky-200 transition-colors">
                  <Upload size={14} />
                  Upload Logo
                  <input type="file" accept="image/*" className="hidden" />
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
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Industry</label>
                  <select
                    value={form.industry}
                    onChange={(e) => handleChange("industry", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all bg-white"
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
                    value={form.size}
                    onChange={(e) => handleChange("size", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all bg-white"
                  >
                    <option value="">Number of employees</option>
                    {COMPANY_SIZES.map((s) => (
                      <option key={s} value={s}>{s} employees</option>
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
                  onChange={(e) => handleChange("description", e.target.value.slice(0, 500))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all resize-none"
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
                  onChange={(e) => handleChange("website", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all"
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
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    <Mail size={14} className="inline mr-1" />
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="hr@techviet.com"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  <MapPin size={14} className="inline mr-1" />
                  Office Address
                </label>
                <input
                  type="text"
                  placeholder="123 Tech Street, District 7, Ho Chi Minh City"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                saved
                  ? "bg-emerald-500 text-white"
                  : "bg-sky-500 hover:bg-sky-600 text-white shadow-sm"
              }`}
            >
              {saved ? (
                <>
                  <CheckCircle size={16} />
                  Saved
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Profile
                </>
              )}
            </button>
          </div>
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
                <CheckCircle size={14} className={form.name ? "text-emerald-500" : "text-slate-300"} />
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
                <CheckCircle size={14} className={form.email ? "text-emerald-500" : "text-slate-300"} />
                Contact Email
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-cyan-50 rounded-xl border border-sky-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900">Public Preview</h3>
            <div className="mt-3 bg-white rounded-lg border border-sky-100 p-4">
              <p className="text-sm font-semibold text-slate-900">{form.name || "Your Company Name"}</p>
              <p className="text-xs text-slate-500 mt-1">{form.industry || "Industry"}</p>
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