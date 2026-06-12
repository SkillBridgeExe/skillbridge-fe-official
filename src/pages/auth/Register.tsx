import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import {
  ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle2,
  GraduationCap, Building2, Users,
  User, Mail, Briefcase, MapPin, Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { type UserRole } from "@/store/useAuthStore";
import { register, resendVerificationEmail } from "@/services/auth.service";
import { useMascotSuccess } from "@/hooks/useMascot";

const LOGO_URL = "https://image2url.com/r2/default/images/1772821810184-bb29e83d-3596-498a-93f2-a1fbdc88b8cc.png";

const ROLES = [
  {
    value: "user" as UserRole,
    label: "Student",
    icon: GraduationCap,
    desc: "I want to learn and improve my skills",
    gradient: "from-blue-500 to-cyan-400",
    ring: "ring-blue-400",
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
    perks: ["Personalized AI learning path", "Detailed skill dashboard", "Connect with mentors"],
  },

  {
    value: "business" as UserRole,
    label: "Business",
    icon: Building2,
    desc: "I want to recruit and train talent",
    gradient: "from-amber-500 to-orange-400",
    ring: "ring-amber-400",
    bg: "bg-amber-50",
    iconColor: "text-amber-600",
    perks: ["AI talent matching", "Team training programs", "Managed hiring pipeline"],
  },
  {
    value: "mentor" as UserRole,
    label: "Mentor",
    icon: Users,
    desc: "I want to mentor and share knowledge",
    gradient: "from-emerald-500 to-teal-400",
    ring: "ring-emerald-400",
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    perks: ["Student management", "Passive income", "Automatic scheduling"],
  },
];

const STEPS = ["Choose role", "Personal info", "Security"];

interface FormData {
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  company: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [form, setForm] = useState<FormData>({
    role: "user",
    fullName: "",
    email: "",
    phone: "",
    location: "",
    company: "",
    password: "",
    confirmPassword: "",
  });
  const progressRef = useRef<HTMLDivElement>(null);

  const update = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    gsap.fromTo(
      ".register-panel",
      { opacity: 0, x: 30 },
      { opacity: 1, x: 0, duration: 0.6, ease: "power3.out" }
    );
  }, []);

  useEffect(() => {
    if (progressRef.current) {
      gsap.to(progressRef.current, {
        width: `${((step + 1) / STEPS.length) * 100}%`,
        duration: 0.5,
        ease: "power2.out",
      });
    }
  }, [step]);
  useEffect(() => {
    if (isSuccess && countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, countdown]);

  const handleResend = async () => {
    try {
      await resendVerificationEmail(form.email);
      toast({
        title: "Email resent",
        description: "A new verification email has been sent. Please check your inbox.",
      });
      setCountdown(60); // Reset timer 60s
    } catch (error) {
      toast({
        title: "Resend failed",
        description: error instanceof Error ? error.message : "Could not resend email.",
        variant: "destructive",
      });
    }
  };
  const { celebrate } = useMascotSuccess();

  const handleSubmit = async () => {
    try {
      setLoading(true);

      await register({
        email: form.email,
        password: form.password,
        displayName: form.fullName,
        role: form.role.toUpperCase(),
      });

      celebrate("Đăng ký thành công — kiểm tra email để xác thực nhé! 🎉");
      setIsSuccess(true);
      setCountdown(60);
    } catch (error) {
      console.error(error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Registration failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find((r) => r.value === form.role)!;

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold font-poppins text-slate-900 mb-3">Check your email</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            We've sent a verification link to <br />
            <span className="font-semibold text-slate-900">{form.email}</span>. <br />
            Please verify your account to continue.
          </p>

          <Button
            onClick={() => navigate("/?auth=login")}
            className="w-full h-12 rounded-xl text-base font-bold bg-primary hover:bg-primary/90 text-white shadow-glow mb-6"
          >
            Proceed to Login <ArrowRight className="w-4 h-4 ml-1" />
          </Button>

          <div className="text-sm text-slate-500">
            Didn't receive the email?{" "}
            {countdown > 0 ? (
              <span className="font-semibold text-slate-700">Resend in {countdown}s</span>
            ) : (
              <button
                onClick={handleResend}
                className="text-primary font-semibold hover:underline"
              >
                Click to resend
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20 flex items-center justify-center p-6">
      <div className="register-panel w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors p-1.5">
              <img src={LOGO_URL} alt="SkillBridge" className="w-full h-full object-contain" />
            </div>
            <span className="font-poppins font-bold text-slate-900">SkillBridge</span>
          </Link>
          <p className="text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/?auth=login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  i < step ? "bg-primary text-white" :
                    i === step ? "bg-primary text-white ring-4 ring-primary/20" :
                      "bg-slate-200 text-slate-400"
                )}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={cn(
                  "text-xs font-medium hidden sm:block",
                  i <= step ? "text-slate-700" : "text-slate-400"
                )}>{s}</span>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px bg-slate-200 mx-3 w-16" />
                )}
              </div>
            ))}
          </div>
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div ref={progressRef} className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full w-0" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* STEP 0: Role */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <h2 className="text-2xl font-poppins font-black text-slate-900 mb-1">
                  Who are you? 🎯
                </h2>
                <p className="text-slate-500 text-sm mb-6">Choose the role that fits you for a personalized experience.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ROLES.map((role) => {
                    const Icon = role.icon;
                    const isActive = form.role === role.value;
                    return (
                      <motion.button
                        key={role.value}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => update("role", role.value)}
                        className={cn(
                          "relative text-left p-5 rounded-2xl border-2 transition-all duration-200",
                          isActive
                            ? `border-transparent bg-gradient-to-br ${role.gradient} text-white shadow-lg`
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                          isActive ? "bg-white/20" : role.bg
                        )}>
                          <Icon className={cn("w-5 h-5", isActive ? "text-white" : role.iconColor)} />
                        </div>
                        <div className={cn("font-bold text-sm mb-0.5", isActive ? "text-white" : "text-slate-800")}>
                          {role.label}
                        </div>
                        <div className={cn("text-xs leading-relaxed mb-3", isActive ? "text-white/70" : "text-slate-400")}>
                          {role.desc}
                        </div>
                        <div className="space-y-1">
                          {role.perks.map((p) => (
                            <div key={p} className={cn("text-[11px] flex items-center gap-1.5", isActive ? "text-white/80" : "text-slate-400")}>
                              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                              {p}
                            </div>
                          ))}
                        </div>
                        {isActive && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-white/30 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                <Button
                  onClick={() => setStep(1)}
                  className="w-full mt-6 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-glow"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* STEP 1: Personal info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br", selectedRole.gradient)}>
                    <selectedRole.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-poppins font-black text-slate-900">Personal Information</h2>
                    <p className="text-xs text-slate-400">Registering as: <span className="font-bold text-primary">{selectedRole.label}</span></p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                      <User className="w-3.5 h-3.5 inline mr-1.5" />Full name *
                    </Label>
                    <Input
                      placeholder="Nguyễn Văn An"
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                      <Mail className="w-3.5 h-3.5 inline mr-1.5" />Email *
                    </Label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                      <Phone className="w-3.5 h-3.5 inline mr-1.5" />Phone number
                    </Label>
                    <Input
                      placeholder="0901 234 567"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>
                  {(form.role === "business" || form.role === "mentor") && (
                    <div>
                      <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                        <Briefcase className="w-3.5 h-3.5 inline mr-1.5" />
                        {form.role === "business" ? "Company name" : "Specialization"}
                      </Label>
                      <Input
                        placeholder={form.role === "business" ? "TechCorp Vietnam" : "Frontend Development"}
                        value={form.company}
                        onChange={(e) => update("company", e.target.value)}
                        className="h-11 rounded-xl border-slate-200"
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                      <MapPin className="w-3.5 h-3.5 inline mr-1.5" />City / Province
                    </Label>
                    <Input
                      placeholder="Ho Chi Minh City"
                      value={form.location}
                      onChange={(e) => update("location", e.target.value)}
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setStep(0)}
                    className="h-12 rounded-xl border-slate-200 font-bold"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!form.fullName || !form.email}
                    className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-glow"
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Security */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <h2 className="text-2xl font-poppins font-black text-slate-900 mb-1">Account Security 🔒</h2>
                <p className="text-slate-500 text-sm mb-6">Create a strong password to protect your account.</p>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">Password *</Label>
                    <div className="relative">
                      <Input
                        type={showPass ? "text" : "password"}
                        placeholder="Minimum 8 characters"
                        value={form.password}
                        onChange={(e) => update("password", e.target.value)}
                        className="h-11 rounded-xl border-slate-200 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.password && (
                      <div className="mt-2 space-y-1">
                        {[
                          { label: "At least 8 characters", ok: form.password.length >= 8 },
                          { label: "Contains uppercase and number", ok: /[A-Z]/.test(form.password) && /\d/.test(form.password) },
                        ].map((r) => (
                          <div key={r.label} className={cn("flex items-center gap-1.5 text-xs", r.ok ? "text-emerald-600" : "text-slate-400")}>
                            <CheckCircle2 className="w-3 h-3" />
                            {r.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">Confirm password *</Label>
                    <Input
                      type="password"
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={(e) => update("confirmPassword", e.target.value)}
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registration summary</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Role:</span><span className="font-semibold text-slate-800">{selectedRole.label}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Name:</span><span className="font-semibold text-slate-800">{form.fullName || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Email:</span><span className="font-semibold text-slate-800">{form.email || "—"}</span></div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-12 rounded-xl border-slate-200 font-bold"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !form.password || form.password !== form.confirmPassword || form.password.length < 8 || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)}
                    className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-glow"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" />
                        Creating account...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Create account <ArrowRight className="w-4 h-4 ml-1" />
                      </span>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          By registering, you agree to the{" "}
          <span className="text-primary cursor-pointer hover:underline">Terms of Service</span>{" "}
          and <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
