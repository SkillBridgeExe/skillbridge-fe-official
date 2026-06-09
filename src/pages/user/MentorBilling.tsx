import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-error";
import { createCheckout } from "@/services/billing.service";
import { useToast } from "@/hooks/use-toast";
import type { BillingPurpose, CreateCheckoutDto } from "@/services/billing.service";

export default function MentorBilling() {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const [purpose, setPurpose] = useState<BillingPurpose>("MENTOR_DEPOSIT");
  const [planCode, setPlanCode] = useState("MENTOR_60");
  const [mentorId, setMentorId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");

  const checkoutMutation = useMutation({
    mutationFn: (payload: CreateCheckoutDto) => createCheckout(payload),
    onSuccess: (checkout) => {
      if (checkout.checkoutUrl) {
        window.location.assign(checkout.checkoutUrl);
        return;
      }
      window.location.assign(`/billing/checkout/${checkout.orderCode}`);
    },
    onError: (error) => {
      toast({
        title: t("billing.mentor.checkoutFailedTitle"),
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const submit = () => {
    if (purpose === "MENTOR_REMAINING") {
      checkoutMutation.mutate({ purpose, bookingId });
      return;
    }
    checkoutMutation.mutate({
      purpose,
      planCode,
      mentorId,
      slotStart: slotStart ? new Date(slotStart).toISOString() : undefined,
      slotEnd: slotEnd ? new Date(slotEnd).toISOString() : undefined,
    });
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <p className="text-sm font-bold uppercase tracking-wider text-[#00AEEF]">{t("billing.mentor.eyebrow")}</p>
            <CardTitle className="font-poppins text-3xl font-black">{t("billing.mentor.title")}</CardTitle>
            <CardDescription>
              {t("billing.mentor.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-3">
              {(["MENTOR_DEPOSIT", "MENTOR_REMAINING"] as BillingPurpose[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPurpose(item)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition-colors ${
                    purpose === item
                      ? "border-[#00AEEF] bg-cyan-50 text-[#037ead]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            {purpose === "MENTOR_REMAINING" ? (
              <div>
                <Label>{t("billing.mentor.bookingId")}</Label>
                <Input value={bookingId} onChange={(event) => setBookingId(event.target.value)} className="mt-1.5 h-11 rounded-xl" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("billing.mentor.planCode")} value={planCode} onChange={setPlanCode} />
                <Field label={t("billing.mentor.mentorId")} value={mentorId} onChange={setMentorId} />
                <Field label={t("billing.mentor.slotStart")} type="datetime-local" value={slotStart} onChange={setSlotStart} />
                <Field label={t("billing.mentor.slotEnd")} type="datetime-local" value={slotEnd} onChange={setSlotEnd} />
              </div>
            )}

            <Button
              className="h-12 w-full rounded-full bg-[#00AEEF] font-bold text-white hover:bg-[#049bd7]"
              disabled={checkoutMutation.isPending}
              onClick={submit}
            >
              {checkoutMutation.isPending ? t("billing.common.creating") : t("billing.mentor.createCheckout")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-11 rounded-xl"
      />
    </div>
  );
}
