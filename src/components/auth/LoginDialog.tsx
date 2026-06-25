import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  User,
  Users,
  X,
} from "lucide-react";
import { CredentialResponse, GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMascotSuccess } from "@/hooks/useMascot";
import { type UserRole } from "@/store/useAuthStore";
import {
  dashboardPathFor,
  getLoginErrorDescription,
  login,
  loginWithGoogle,
  register,
  resendVerificationEmail,
} from "@/services/auth.service";
import loginPanel from "@/assets/panel/loginpanel.jpg";
import { GOOGLE_CLIENT_ID } from "@/lib/runtime-config";

type AuthMode = "login" | "register";

interface LoginDialogProps {
  open: boolean;
  mode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
  onOpenChange: (open: boolean) => void;
}

const ROLES: Array<{
  value: UserRole;
  icon: typeof GraduationCap;
}> = [
  {
    value: "user",
    icon: GraduationCap,
  },
  {
    value: "business",
    icon: Building2,
  },
  {
    value: "mentor",
    icon: Users,
  },
];

export function LoginDialog({
  open,
  mode = "login",
  onModeChange,
  onOpenChange,
}: LoginDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { celebrate } = useMascotSuccess();
  const { t } = useTranslation("common");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const [role, setRole] = useState<UserRole>("user");
  const [fullName, setFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const isRegister = mode === "register";
  const formView = registerSuccess ? "success" : mode;

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!registerSuccess || countdown <= 0) return;

    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, registerSuccess]);

  useEffect(() => {
    if (open) return;

    setShowPass(false);
    setLoading(false);
  }, [open]);

  if (!open) return null;

  const switchMode = (nextMode: AuthMode) => {
    setRegisterSuccess(false);
    onModeChange?.(nextMode);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast({
        title: "Missing credentials",
        description: "Please enter both email and password.",
      });
      return;
    }

    try {
      setLoading(true);
      const { role: userRole, source, displayName } = await login(email, password);

      const nameToDisplay = displayName || userRole;

      celebrate(
        source === "mock"
          ? t("auth.toast.loginDemoSuccess", { role: nameToDisplay })
          : t("auth.toast.loginSuccess", { role: nameToDisplay }),
      );
      onOpenChange(false);
      navigate(dashboardPathFor(userRole));
    } catch (err) {
      toast({
        title: t("auth.toast.loginFailedTitle"),
        description: getLoginErrorDescription(
          err,
          t("auth.toast.loginFailedDesc"),
          t("auth.toast.loginFailedGenericDesc"),
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !registerEmail || !registerPassword || !confirmPassword) {
      toast({
        title: t("auth.toast.missingInfoTitle"),
        description: t("auth.toast.missingInfoDesc"),
      });
      return;
    }

    if (registerPassword !== confirmPassword) {
      toast({
        title: t("auth.toast.passwordMismatchTitle"),
        description: t("auth.toast.passwordMismatchDesc"),
        variant: "destructive",
      });
      return;
    }

    if (registerPassword.length < 8 || !/[A-Z]/.test(registerPassword) || !/\d/.test(registerPassword)) {
      toast({
        title: t("auth.toast.weakPasswordTitle"),
        description: t("auth.toast.weakPasswordDesc"),
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await register({
        email: registerEmail,
        password: registerPassword,
        displayName: fullName,
        role: role.toUpperCase(),
      });

      celebrate(t("auth.toast.registerSuccess"));
      setRegisterSuccess(true);
      setCountdown(60);
    } catch (err) {
      toast({
        title: t("auth.toast.registerFailedTitle"),
        description: err instanceof Error ? err.message : t("auth.toast.registerFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendVerificationEmail(registerEmail);
      toast({
        title: t("auth.toast.emailResentTitle"),
        description: t("auth.toast.emailResentDesc"),
      });
      setCountdown(60);
    } catch (err) {
      toast({
        title: t("auth.toast.resendFailedTitle"),
        description: err instanceof Error ? err.message : t("auth.toast.resendFailedDesc"),
        variant: "destructive",
      });
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error("No credential received from Google");
      }

      setLoading(true);
      const { role: userRole, displayName } = await loginWithGoogle(credentialResponse.credential);
      const nameToDisplay = displayName || userRole;

      celebrate(t("auth.toast.googleSuccess", { role: nameToDisplay }));
      onOpenChange(false);
      navigate(dashboardPathFor(userRole));
    } catch (err) {
      toast({
        title: t("auth.toast.googleFailedTitle"),
        description: err instanceof Error ? err.message : t("auth.toast.googleFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return createPortal(
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#2b0b55]/78 backdrop-blur-[2px]">
      <div className="flex min-h-full items-center justify-center px-3 py-2 sm:px-4">
        <button
          type="button"
          className="fixed inset-0 h-full w-full cursor-default"
          aria-label="Close login"
          onClick={() => onOpenChange(false)}
        />

        <motion.div
          layout
          initial={{ y: 24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{
            duration: 0.35,
            ease: "easeOut",
            layout: { type: "spring", stiffness: 95, damping: 18, mass: 0.85 },
          }}
          className="relative z-10 grid h-[44rem] max-h-[calc(100dvh-1rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white p-4 shadow-[0_26px_90px_rgba(14,5,37,0.42)] lg:grid-cols-2"
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close login"
          >
            <X className="h-5 w-5" />
          </button>

          <motion.div
            layout
            animate={{ scale: isRegister ? 1.015 : 1 }}
            transition={{ layout: { type: "spring", stiffness: 95, damping: 18, mass: 0.85 } }}
            className={`relative hidden h-full min-h-0 overflow-hidden rounded-[1.45rem] bg-[#00AEEF] lg:block ${
              isRegister ? "lg:order-2" : "lg:order-1"
            }`}
          >
            <img
              src={loginPanel}
              alt=""
              draggable={false}
              className="h-full w-full object-cover object-[center_34%]"
            />
            <motion.div
              key={mode}
              className="pointer-events-none absolute inset-y-0 -left-28 w-24 rotate-12 bg-white/25 blur-xl"
              initial={{ x: 0, opacity: 0 }}
              animate={{ x: 720, opacity: [0, 0.7, 0] }}
              transition={{ duration: 0.75, ease: "easeInOut" }}
            />
          </motion.div>

          <motion.div
            layout
            transition={{ layout: { type: "spring", stiffness: 95, damping: 18, mass: 0.85 } }}
            className={`flex h-full min-h-0 flex-col overflow-y-auto px-5 py-8 sm:px-10 lg:px-14 ${
              isRegister ? "lg:order-1" : "lg:order-2"
            } ${isRegister || registerSuccess ? "justify-start" : "justify-center"}`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={formView}
                initial={{ opacity: 0, x: isRegister ? -24 : 24, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: isRegister ? 24 : -24, filter: "blur(4px)" }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="w-full"
              >
            {registerSuccess ? (
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-cyan-100 text-[#00AEEF]">
                  <Mail className="h-10 w-10" />
                </div>
                <h2 className="font-poppins text-3xl font-black tracking-tight text-slate-950">
                  {t("auth.checkEmailTitle")}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {t("auth.checkEmailDesc")}{" "}
                  <span className="font-bold text-slate-900">{registerEmail}</span>.
                </p>
                <Button
                  onClick={() => switchMode("login")}
                  className="mt-7 h-14 w-full rounded-full bg-[#00AEEF] text-base font-black text-white hover:bg-[#049bd7]"
                >
                  {t("auth.proceedLogin")} <ArrowRight className="h-4 w-4" />
                </Button>
                <div className="mt-5 text-sm text-slate-500">
                  {t("auth.didNotReceive")}{" "}
                  {countdown > 0 ? (
                    <span className="font-bold text-slate-800">{t("auth.resendIn", { seconds: countdown })}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="font-bold text-[#00AEEF] hover:underline"
                    >
                      {t("auth.resendNow")}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6 inline-flex w-fit rounded-full bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                      !isRegister ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    {t("auth.loginTab")}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                      isRegister ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    {t("auth.registerTab")}
                  </button>
                </div>

                <h2 className="font-poppins text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  {isRegister ? t("auth.registerTitle") : t("auth.loginTitle")}
                </h2>
                

                {isRegister ? (
                  <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {ROLES.map((item) => {
                        const Icon = item.icon;
                        const active = role === item.value;

                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setRole(item.value)}
                            className={`rounded-2xl border p-3 text-left transition-colors ${
                              active
                                ? "border-[#00AEEF] bg-cyan-50"
                                : "border-slate-200 bg-white hover:border-cyan-200"
                            }`}
                          >
                            <Icon className={active ? "h-4 w-4 text-[#00AEEF]" : "h-4 w-4 text-slate-400"} />
                            <p className="mt-2 text-xs font-black text-slate-900">
                              {t(`auth.role.${item.value === "user" ? "userLabel" : item.value === "business" ? "businessLabel" : "mentorLabel"}`)}
                            </p>
                            <p className="mt-0.5 hidden text-[10px] leading-4 text-slate-500 sm:block">
                              {t(`auth.role.${item.value === "user" ? "userDesc" : item.value === "business" ? "businessDesc" : "mentorDesc"}`)}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    <div>
                      <Label className="mb-1.5 block text-sm font-semibold text-slate-700">{t("auth.fullName")}</Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-700" />
                        <Input
                          placeholder={t("auth.fullNamePlaceholder")}
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          className="h-12 rounded-2xl border-2 border-slate-900 bg-white pl-12 text-base focus:border-[#00AEEF] focus:ring-cyan-100"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="mb-1.5 block text-sm font-semibold text-slate-700">{t("auth.email")}</Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-700" />
                        <Input
                          type="email"
                          placeholder={t("auth.emailPlaceholder")}
                          value={registerEmail}
                          onChange={(event) => setRegisterEmail(event.target.value)}
                          className="h-12 rounded-2xl border-2 border-slate-900 bg-white pl-12 text-base focus:border-[#00AEEF] focus:ring-cyan-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="mb-1.5 block text-sm font-semibold text-slate-700">{t("auth.password")}</Label>
                        <Input
                          type="password"
                          placeholder={t("auth.passwordRegisterPlaceholder")}
                          value={registerPassword}
                          onChange={(event) => setRegisterPassword(event.target.value)}
                          className="h-12 rounded-2xl border-2 border-slate-900 bg-white text-base focus:border-[#00AEEF] focus:ring-cyan-100"
                        />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-sm font-semibold text-slate-700">{t("auth.confirmPassword")}</Label>
                        <Input
                          type="password"
                          placeholder={t("auth.confirmPasswordPlaceholder")}
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          onKeyDown={(event) => event.key === "Enter" && handleRegister()}
                          className="h-12 rounded-2xl border-2 border-slate-900 bg-white text-base focus:border-[#00AEEF] focus:ring-cyan-100"
                        />
                      </div>
                    </div>

                    {registerPassword && (
                      <div className="grid gap-1 text-xs">
                        {[
                          { label: t("auth.ruleLength"), ok: registerPassword.length >= 8 },
                          {
                            label: t("auth.ruleUpperNumber"),
                            ok: /[A-Z]/.test(registerPassword) && /\d/.test(registerPassword),
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className={item.ok ? "flex items-center gap-1.5 text-emerald-600" : "flex items-center gap-1.5 text-slate-400"}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {item.label}
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      onClick={handleRegister}
                      disabled={loading}
                      className="h-14 w-full rounded-full bg-[#00AEEF] text-base font-black text-white shadow-[0_10px_22px_rgba(0,174,239,0.22)] hover:bg-[#049bd7] disabled:bg-[#8bdcf7]"
                    >
                      {loading ? t("auth.creatingAccount") : t("auth.createAccountButton")}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mt-8 space-y-4">
                      <div>
                        <Label className="mb-1.5 block text-sm font-semibold text-slate-700">{t("auth.email")}</Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-700" />
                          <Input
                            type="email"
                            autoComplete="off"
                            placeholder={t("auth.emailInputPlaceholder")}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="h-14 rounded-2xl border-2 border-slate-900 bg-white pl-12 text-base focus:border-[#00AEEF] focus:ring-cyan-100"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <Label className="text-sm font-semibold text-slate-700">{t("auth.password")}</Label>
                          <button
                            type="button"
                            onClick={() => {
                              onOpenChange(false);
                              navigate("/forgot-password");
                            }}
                            className="text-xs font-semibold text-[#00AEEF] hover:underline"
                          >
                            {t("auth.forgotPassword")}
                          </button>
                        </div>
                        <div className="relative">
                          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-700" />
                          <Input
                            type={showPass ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder={t("auth.passwordInputPlaceholder")}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            onKeyDown={(event) => event.key === "Enter" && handleLogin()}
                            className="h-14 rounded-2xl border-2 border-slate-900 bg-white pl-12 pr-12 text-base focus:border-[#00AEEF] focus:ring-cyan-100"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass((value) => !value)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-900"
                            aria-label={showPass ? "Hide password" : "Show password"}
                          >
                            {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="my-6 flex items-center gap-4">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-sm font-bold text-slate-800">{t("auth.or")}</span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    {/* The REAL Google button must stay visible: hiding it under an
                        opacity-0 overlay breaks the FedCM flow in 2026 browsers
                        (anti-clickjacking) and violates Google's branding rules.
                        useOneTap restores the One Tap path that production users
                        were actually logging in with before #43 dropped it. */}
                    <div className="flex w-full justify-center">
                      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                        <GoogleLogin
                          onSuccess={handleGoogleSuccess}
                          onError={() => {
                            toast({
                              title: t("auth.toast.googleFailedTitle"),
                              description: t("auth.toast.googleFailedDesc"),
                              variant: "destructive",
                            });
                          }}
                          useOneTap
                          theme="outline"
                          size="large"
                          shape="pill"
                          text="continue_with"
                        />
                      </GoogleOAuthProvider>
                    </div>

                    <Button
                      onClick={handleLogin}
                      disabled={loading}
                      className="mt-7 h-14 w-full rounded-full bg-[#00AEEF] text-base font-black text-white shadow-[0_10px_22px_rgba(0,174,239,0.22)] hover:bg-[#049bd7] disabled:bg-[#8bdcf7]"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                            className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                          />
                          {t("auth.signingIn")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {t("auth.continue")} <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>


                  </>
                )}
              </>
            )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
}

export default LoginDialog;
