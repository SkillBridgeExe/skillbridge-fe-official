import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles, X } from "lucide-react";
import { CredentialResponse, GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMascotSuccess } from "@/hooks/useMascot";
import { MOCK_LOGIN_ACCOUNTS } from "@/store/useAuthStore";
import { dashboardPathFor, login, loginWithGoogle } from "@/services/auth.service";
import laptopMascot from "@/assets/mascot/laptop.png";

const LOGO_URL = "https://image2url.com/r2/default/images/1772821810184-bb29e83d-3596-498a-93f2-a1fbdc88b8cc.png";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "973344038436-p701b3b89iiium7eitf1mik4n6t5novi.apps.googleusercontent.com";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { celebrate } = useMascotSuccess();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEmail("");
    setPassword("");
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".login-popup",
        { y: 28, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.65, ease: "power3.out" },
      );
      gsap.fromTo(
        ".login-art-piece",
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.08, duration: 0.55, ease: "power3.out", delay: 0.25 },
      );
    }, formRef);

    return () => ctx.revert();
  }, []);

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
      const { role, source } = await login(email, password);

      celebrate(
        source === "mock"
          ? `Dang nhap demo thanh cong - ${role}`
          : `Dang nhap thanh cong - ${role}`,
      );
      navigate(dashboardPathFor(role));
    } catch (err) {
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error("No credential received from Google");
      }

      setLoading(true);
      const { role } = await loginWithGoogle(credentialResponse.credential);

      celebrate(`Dang nhap Google thanh cong - ${role}`);
      navigate(dashboardPathFor(role));
    } catch (err) {
      toast({
        title: "Google Login failed",
        description: err instanceof Error ? err.message : "Failed to authenticate with Google.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast({
      title: "Google Login failed",
      description: "Could not authenticate with Google.",
      variant: "destructive",
    });
  };

  const handleUseMockAccount = (accountEmail: string, accountPassword: string) => {
    setEmail(accountEmail);
    setPassword(accountPassword);
  };

  return (
    <div
      ref={formRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#2b0b55] px-4 py-8"
    >
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full border-[14px] border-lime-400/55" />
      <div className="pointer-events-none absolute -bottom-10 right-12 h-24 w-24 rounded-full border-[12px] border-lime-400/55" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-28 w-[34rem] -translate-x-1/2 skew-x-[-18deg] bg-white/10" />

      <div className="login-popup relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white p-4 shadow-[0_26px_90px_rgba(14,5,37,0.42)] lg:grid-cols-[1.02fr_1fr]">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Close login"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative hidden min-h-[31rem] overflow-hidden rounded-[1.45rem] bg-gradient-to-br from-[#8b43ff] via-[#a25af8] to-[#c696ff] lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_30%,rgba(255,255,255,0.24),transparent_22%),radial-gradient(circle_at_78%_82%,rgba(255,255,255,0.22),transparent_26%)]" />
          <div className="login-art-piece absolute left-8 top-10 flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/18 p-2 ring-1 ring-white/30">
              <img src={LOGO_URL} alt="SkillBridge" className="h-full w-full object-contain" />
            </div>
            <span className="font-poppins text-lg font-black text-white">SkillBridge</span>
          </div>
          <Sparkles className="login-art-piece absolute left-12 top-32 h-9 w-9 text-yellow-200" />
          <Sparkles className="login-art-piece absolute right-12 top-40 h-6 w-6 text-yellow-200" />

          <div className="login-art-piece absolute left-12 top-56 h-28 w-52 rounded-3xl bg-lime-300 shadow-[0_16px_36px_rgba(84,33,160,0.22)]" />
          <div className="login-art-piece absolute left-20 top-52 h-28 w-44 rounded-2xl border-[6px] border-lime-200 bg-white shadow-[0_8px_0_rgba(62,23,116,0.18)]">
            <div className="mx-5 mt-5 h-5 rounded bg-violet-200" />
            <div className="mx-5 mt-3 grid grid-cols-[1fr_2.1rem] gap-3">
              <div className="space-y-2">
                <div className="h-3 rounded bg-violet-200" />
                <div className="h-3 rounded bg-orange-200" />
                <div className="h-3 rounded bg-orange-200" />
              </div>
              <div className="rounded-lg bg-orange-400" />
            </div>
          </div>

          <motion.img
            src={laptopMascot}
            alt=""
            draggable={false}
            className="login-art-piece absolute -bottom-6 left-4 h-[21rem] w-[28rem] max-w-none object-contain drop-shadow-[0_22px_30px_rgba(45,12,91,0.22)]"
            animate={{ y: [0, -8, 0], rotate: [-1.5, 1.5, -1.5] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="login-art-piece absolute bottom-16 left-10 h-2 w-44 rounded-full bg-white/90" />
          <div className="login-art-piece absolute bottom-0 right-[-4rem] h-48 w-48 rounded-full bg-white/80" />
        </div>

        <div className="flex min-h-[31rem] flex-col justify-center px-5 py-12 sm:px-10 lg:px-12">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="h-10 w-10 rounded-2xl bg-violet-100 p-2">
              <img src={LOGO_URL} alt="SkillBridge" className="h-full w-full object-contain" />
            </div>
            <span className="font-poppins text-lg font-black text-slate-900">SkillBridge</span>
          </div>

          <div className="mb-8">
            <h1 className="font-poppins text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Nhap email de tiep tuc
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Dang nhap vao SkillBridge hoac{" "}
              <Link to="/register" className="font-semibold text-violet-600 hover:underline">
                tao tai khoan moi
              </Link>
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-700" />
                <Input
                  type="email"
                  name="sb_login_email"
                  autoComplete="off"
                  placeholder="Nhap email cua ban"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-2xl border-2 border-slate-900 bg-white pl-12 text-base focus:border-violet-500 focus:ring-violet-200"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700">Password</Label>
                <button type="button" className="text-xs font-semibold text-violet-600 hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-700" />
                <Input
                  type={showPass ? "text" : "password"}
                  name="sb_login_password"
                  autoComplete="new-password"
                  placeholder="Nhap mat khau"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="h-14 rounded-2xl border-2 border-slate-900 bg-white pl-12 pr-12 text-base focus:border-violet-500 focus:ring-violet-200"
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
            <span className="text-sm font-bold text-slate-800">Hoac</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="flex justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3">
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                size="large"
                shape="circle"
              />
            </GoogleOAuthProvider>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="mt-7 h-14 w-full rounded-2xl bg-[#bd8cff] text-base font-black text-white shadow-none transition-colors hover:bg-[#a873f5] disabled:bg-[#d3b5ff]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                  className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                />
                Dang dang nhap...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Tiep tuc <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {MOCK_LOGIN_ACCOUNTS.slice(0, 2).map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => handleUseMockAccount(account.email, account.password)}
                className="rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2 text-left transition-colors hover:border-violet-300 hover:bg-violet-50"
              >
                <p className="truncate text-xs font-bold text-slate-800">{account.label}</p>
                <p className="truncate text-[11px] text-slate-500">{account.email}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
