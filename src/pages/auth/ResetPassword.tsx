import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { AuthFlowCard } from "@/components/auth/AuthFlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api-error";
import { resetPassword } from "@/services/auth.service";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!token) {
      setError("The password reset token is missing.");
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError("Use at least 8 characters with an uppercase letter and a number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await resetPassword(token, password);
      setComplete(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "The reset link is invalid or expired."));
    } finally {
      setSubmitting(false);
    }
  };

  if (complete) {
    return (
      <AuthFlowCard
        icon={<CheckCircle2 className="h-7 w-7" />}
        title="Password updated"
        description="Your previous sessions have been signed out. You can now sign in with the new password."
      >
        <Button asChild className="h-12 w-full rounded-xl">
          <Link to="/?auth=login">Sign in</Link>
        </Button>
      </AuthFlowCard>
    );
  }

  return (
    <AuthFlowCard
      icon={<KeyRound className="h-7 w-7" />}
      title="Create a new password"
      description="The reset link can be used once and expires after 30 minutes."
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-700" htmlFor="new-password">
            New password
          </label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-12 rounded-xl"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700" htmlFor="confirm-password">
            Confirm password
          </label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void handleSubmit()}
            className="mt-2 h-12 rounded-xl"
          />
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <Button
        onClick={() => void handleSubmit()}
        disabled={submitting}
        className="mt-5 h-12 w-full rounded-xl"
      >
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Reset password
      </Button>
    </AuthFlowCard>
  );
}
