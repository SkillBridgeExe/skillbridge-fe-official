import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import {
  Eye, EyeOff, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMascotSuccess } from "@/hooks/useMascot";
import { MOCK_LOGIN_ACCOUNTS } from "@/store/useAuthStore";
import { dashboardPathFor, login, loginWithGoogle } from "@/services/auth.service";
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from "@react-oauth/google";

const LOGO_URL = "https://image2url.com/r2/default/images/1772821810184-bb29e83d-3596-498a-93f2-a1fbdc88b8cc.png";

// Google OAuth client ID — public by design (it ships in the JS bundle anyway);
// override per environment via VITE_GOOGLE_CLIENT_ID.
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "623397197354-7b3pae48gui0nkn2s4ml2vjatfm15mqt.apps.googleusercontent.com";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { celebrate } = useMascotSuccess();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure fields start empty even when browser tries to restore values.
    setEmail("");
    setPassword("");
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-stat",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: "power3.out", delay: 0.4 }
      );
      gsap.fromTo(
        ".hero-feature",
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: "power3.out", delay: 0.7 }
      );
      gsap.fromTo(
        ".form-card",
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, ease: "power3.out", delay: 0.2 }
      );
    });
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

      // API thật trước; service tự fallback sang 4 account demo khi BE từ chối.
      const { role, source } = await login(email, password);

      celebrate(
        source === "mock"
          ? `Đăng nhập demo thành công — ${role} 👋`
          : `Đăng nhập thành công — ${role} 👋`,
      );
      navigate(dashboardPathFor(role));
    } catch (err) {
      toast({
        title: "Login failed",
        description:
          err instanceof Error ? err.message : "Invalid email or password.",
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

      celebrate(`Đăng nhập Google thành công — ${role} 👋`);
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
    <div className=" flex overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* ── LEFT PANEL ── */}
      <div
        ref={heroRef}
        className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden p-12 xl:p-16"
        style={{
          background:
            "linear-gradient(145deg, #0f172a 0%, #1e1b4b 35%, #0f172a 60%, #0c1a2e 100%)",
        }}
      >
      </div>

      {/* ── RIGHT PANEL: FORM ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div ref={formRef} className="form-card w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 p-1.5">
              <img src={LOGO_URL} alt="SkillBridge" className="w-full h-full object-contain" />
            </div>
            <span className="font-poppins font-bold text-lg text-slate-900">SkillBridge</span>
          </div>

          {/* Header */}
          <div>
            <h2 className="text-3xl font-poppins font-black text-slate-900 tracking-tight">
              Welcome back!
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              Sign in to continue your journey.{" "}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Create a new account
              </Link>
            </p>
          </div>



          {/* Form */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">Email</Label>
              <Input
                type="email"
                name="sb_login_email"
                autoComplete="off"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl border-slate-200 focus:border-primary focus:ring-primary/20 bg-slate-50/50"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm font-semibold text-slate-700">Password</Label>
                <button className="text-xs text-primary font-medium hover:underline">
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  name="sb_login_password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="h-11 rounded-xl border-slate-200 focus:border-primary pr-10 bg-slate-50/50"
                />

                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-12 rounded-xl text-base font-bold bg-primary hover:bg-primary/90 text-white shadow-glow transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block"
                  />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Social */}
          <div className="grid gap-3 w-full justify-center">
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                // khi gọi thành công sẽ gọi successUrl của backend 
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                // locale="eng"
                size="large"
                shape="circle"
              />
            </GoogleOAuthProvider>
          </div>

          {/* Demo accounts — chạy song song với auth thật (luật CLAUDE.md) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-700">Demo accounts</p>
            <div className="space-y-2">
              {MOCK_LOGIN_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => handleUseMockAccount(account.email, account.password)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <p className="text-xs font-semibold text-slate-800">
                    {account.label} | {account.email}
                  </p>
                  <p className="text-xs text-slate-500">Click to fill</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}