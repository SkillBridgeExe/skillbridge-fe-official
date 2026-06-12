import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resendVerificationEmail, verifyEmail } from "@/services/auth.service";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Verifying your email...");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing.");
      return;
    }

    verifyEmail(token)
      .then(() => {
        setStatus("success");
        setMessage("Email verified successfully. Opening sign in...");
        setTimeout(() => {
          navigate("/?auth=login");
        }, 2000);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message || "Invalid or expired verification token.");
      });
  }, [searchParams, navigate]);

  const handleResend = async () => {
    if (!email.trim()) {
      setResendMessage("Please enter your email.");
      return;
    }

    try {
      setResending(true);
      setResendMessage("");

      await resendVerificationEmail(email);

      setResendMessage(
        "If this email exists and is not verified, a new verification email has been sent."
      );
    } catch (err) {
      setResendMessage(
        err instanceof Error
          ? err.message
          : "Failed to resend verification email."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/80 p-8 text-center shadow-xl border border-blue-100">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <span className="text-3xl">
            {status === "loading" && "⏳"}
            {status === "success" && "✅"}
            {status === "error" && "⚠️"}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          {status === "loading" && "Verifying Email"}
          {status === "success" && "Verification Successful"}
          {status === "error" && "Verification Failed"}
        </h1>

        <p className="mt-3 text-sm text-slate-600">{message}</p>

        {status === "error" && (
          <div className="mt-6 space-y-4">
            <div className="text-left">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resending ? "Sending..." : "Resend Verification Email"}
            </button>

            {resendMessage && (
              <p className="text-sm text-slate-600">{resendMessage}</p>
            )}

            <button
              onClick={() => navigate("/?auth=login")}
              className="text-sm font-medium text-blue-600 underline"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
