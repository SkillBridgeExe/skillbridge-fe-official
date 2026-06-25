import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Loader2, MailCheck } from "lucide-react";
import { AuthFlowCard } from "@/components/auth/AuthFlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api-error";
import { forgotPassword } from "@/services/auth.service";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Could not request a password reset."));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <AuthFlowCard
        icon={<MailCheck className="h-7 w-7" />}
        title="Check your email"
        description="If a credentials account exists for that address, we sent a one-time reset link. The link expires in 30 minutes."
      >
        <Button asChild className="h-12 w-full rounded-xl">
          <Link to="/?auth=login">Back to sign in</Link>
        </Button>
      </AuthFlowCard>
    );
  }

  return (
    <AuthFlowCard
      icon={<KeyRound className="h-7 w-7" />}
      title="Forgot your password?"
      description="Enter the email used for your SkillBridge credentials account."
    >
      <label className="text-sm font-semibold text-slate-700" htmlFor="forgot-email">
        Email address
      </label>
      <Input
        id="forgot-email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && void handleSubmit()}
        className="mt-2 h-12 rounded-xl"
      />
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <Button
        onClick={() => void handleSubmit()}
        disabled={submitting}
        className="mt-5 h-12 w-full rounded-xl"
      >
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Send reset link
      </Button>
    </AuthFlowCard>
  );
}
