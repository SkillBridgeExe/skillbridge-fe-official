import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { AuthFlowCard } from "@/components/auth/AuthFlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api-error";
import { resendVerificationEmail, verifyEmail } from "@/services/auth.service";

type VerifyStatus = "loading" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<VerifyStatus>("loading");
  const [message, setMessage] = useState("We are confirming your email address.");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("The verification token is missing.");
      return;
    }
    let active = true;
    verifyEmail(token)
      .then(() => {
        if (!active) return;
        setStatus("success");
        setMessage("Your email is verified. You can now sign in to SkillBridge.");
      })
      .catch((error) => {
        if (!active) return;
        setStatus("error");
        setMessage(getApiErrorMessage(error, "The verification link is invalid or expired."));
      });
    return () => {
      active = false;
    };
  }, [token]);

  const handleResend = async () => {
    if (!email.trim()) {
      setMessage("Enter your registered email to request a new link.");
      return;
    }
    setResending(true);
    try {
      await resendVerificationEmail(email);
      setMessage("If the account exists and is unverified, a new link has been sent.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Could not resend the verification email."));
    } finally {
      setResending(false);
    }
  };

  const icon =
    status === "loading" ? (
      <Loader2 className="h-7 w-7 animate-spin" />
    ) : status === "success" ? (
      <CheckCircle2 className="h-7 w-7" />
    ) : (
      <AlertTriangle className="h-7 w-7" />
    );

  return (
    <AuthFlowCard
      icon={icon}
      title={
        status === "loading"
          ? "Verifying email"
          : status === "success"
            ? "Email verified"
            : "Verification failed"
      }
      description={message}
    >
      {status === "success" ? (
        <div className="grid gap-3">
          <Button asChild className="h-12 rounded-xl">
            <Link to="/?auth=login">Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-xl">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      ) : null}
      {status === "error" ? (
        <div>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-12 rounded-xl pl-11"
            />
          </div>
          <Button
            onClick={() => void handleResend()}
            disabled={resending}
            className="mt-3 h-12 w-full rounded-xl"
          >
            {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Resend verification email
          </Button>
        </div>
      ) : null}
    </AuthFlowCard>
  );
}
