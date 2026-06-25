import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { AuthFlowCard } from "@/components/auth/AuthFlowCard";
import { Button } from "@/components/ui/button";
import { verifyWorkEmailApi } from "@/api/business-company";
import { getApiErrorMessage } from "@/lib/api-error";

export default function BusinessVerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("We are confirming your company work email.");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("The work-email verification token is missing.");
      return;
    }
    let active = true;
    verifyWorkEmailApi(token)
      .then(() => {
        if (!active) return;
        setStatus("success");
        setMessage("Your work email is verified. You can continue the company review process.");
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
          ? "Verifying work email"
          : status === "success"
            ? "Work email verified"
            : "Verification failed"
      }
      description={message}
    >
      {status !== "loading" ? (
        <div className="grid gap-3">
          <Button asChild className="h-12 rounded-xl">
            <Link to="/business/profile">Open company profile</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-xl">
            <Link to="/?auth=login">Sign in</Link>
          </Button>
        </div>
      ) : null}
    </AuthFlowCard>
  );
}
