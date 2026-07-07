import { useMemo, useState } from "react";
import { Github, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useGithubEvidenceMutation } from "@/hooks/use-diagnosis";
import { ENABLE_GITHUB_EVIDENCE } from "@/lib/runtime-config";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import type { CanonicalCvDocument, GithubEvidenceResponse, GithubSkillEvidence } from "@shared/api";

const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";
const USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

export function GithubEvidence({
  cvId,
  document,
}: {
  cvId: string | null;
  document?: CanonicalCvDocument;
}) {
  const { t, i18n } = useTranslation("diagnosis");
  const { toast } = useToast();
  const lang = i18n.language?.startsWith("vi") ? "vi" : "en";
  const prefill = useMemo(() => extractGithubUsername(document), [document]);
  const [username, setUsername] = useState(prefill);
  const [consent, setConsent] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const mutation = useGithubEvidenceMutation();

  if (!ENABLE_GITHUB_EVIDENCE || !cvId) return null;

  const normalizedUsername = username.trim().replace(/^@/, "");
  const usernameValid = USERNAME_PATTERN.test(normalizedUsername);
  const canSubmit = usernameValid && consent && !mutation.isPending;

  const submit = () => {
    if (!canSubmit) return;
    mutation.mutate(
      { cvId, username: normalizedUsername, lang },
      {
        onSuccess: (result) => {
          setShowForm(result.available !== true);
          // W41: persist credentials so gap-report can attach github_username + github_consent
          if (result.available) {
            useDiagnosisStore.getState().setGithubCredentials(normalizedUsername, true);
          }
        },
        onError: (err: Error) =>
          toast({
            title: t("github.errorTitle"),
            description: err?.message || t("github.errorDesc"),
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <section className="mt-6">
      <div className={cn(CARD, "overflow-hidden")}>
        <div className="border-b border-[#EAEAEA] p-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#2F3437]">
            <Github className="h-5 w-5 text-primary" />
            {t("github.title")}
          </h3>
          <p className="mt-1 text-xs text-[#787774]">{t("github.subtitle")}</p>
        </div>

        <div className="p-5">
          {showForm || !mutation.data ? (
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <label className="mb-2 block text-xs font-bold text-[#2F3437]" htmlFor="github-username">
                  {t("github.username")}
                </label>
                <Input
                  id="github-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={t("github.usernamePlaceholder")}
                  className="h-11 rounded-lg"
                />
                {username && !usernameValid && (
                  <p className="mt-1 text-xs font-medium text-[#9F2F2D]">{t("github.reason.INVALID_USERNAME")}</p>
                )}
                <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[#787774]">
                  <Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} className="mt-0.5" />
                  <span>{t("github.consent")}</span>
                </label>
              </div>
              <Button type="button" disabled={!canSubmit} onClick={submit} className="h-11 rounded-lg bg-primary px-5 font-bold text-white hover:bg-primary/90">
                {mutation.isPending ? t("github.loading") : t("github.connect")}
              </Button>
              {mutation.data && mutation.data.available === false && (
                <p className="md:col-span-2 rounded-lg border border-[#F1E5C0] bg-[#FBF3DB] px-3 py-2 text-xs font-medium text-[#956400]">
                  {t(`github.reason.${mutation.data.reason}`)}
                </p>
              )}
            </div>
          ) : (
            <GithubEvidenceResult
              data={mutation.data}
              onChangeHandle={() => setShowForm(true)}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function GithubEvidenceResult({
  data,
  onChangeHandle,
}: {
  data: GithubEvidenceResponse;
  onChangeHandle: () => void;
}) {
  const { t } = useTranslation("diagnosis");

  if (data.available === false) {
    return (
      <div className="rounded-lg border border-[#F1E5C0] bg-[#FBF3DB] px-3 py-2 text-xs font-medium text-[#956400]">
        {t(`github.reason.${data.reason}`)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#787774]">
          {t("github.analyzed", { n: data.analyzed_repo_count, u: data.username })}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onChangeHandle} className="w-fit rounded-lg text-xs font-bold">
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          {t("github.change")}
        </Button>
      </div>

      {data.cv_skill_join === false && (
        <p className="rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] px-3 py-2 text-xs text-[#787774]">{t("github.noJoin")}</p>
      )}

      <EvidenceGroup title={t("github.backedTitle")} items={data.corroborated} tone="green" />
      <EvidenceGroup title={t("github.notOnCv")} items={data.github_only} tone="info" />
    </div>
  );
}

function EvidenceGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: GithubSkillEvidence[];
  tone: "green" | "info";
}) {
  const { t } = useTranslation("diagnosis");
  if (!items?.length) return null;

  return (
    <div>
      <h4 className="text-sm font-bold text-[#2F3437]">{title}</h4>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.skill_canonical} className="rounded-xl border border-[#EAEAEA] bg-[#FBFBFA] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-[#2F3437]">{item.display_name}</span>
              <span className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-bold",
                tone === "green" ? "border-[#DCE9D7] bg-[#EDF3EC] text-[#346538]" : "border-[#BEE3F8] bg-[#E1F3FE] text-[#1F6C9F]",
              )}>
                {tone === "green" ? t("github.backed") : t("github.handleSignal")}
              </span>
              <span className="font-mono text-[11px] font-bold text-[#787774] tabular-nums">
                {t("github.repoCount", { n: item.repo_count })}
              </span>
              {item.most_recent_year && (
                <span className="font-mono text-[11px] font-bold text-[#787774] tabular-nums">{item.most_recent_year}</span>
              )}
            </div>
            {item.repos?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {item.repos.slice(0, 3).map((repo) => (
                  <a
                    key={repo.url}
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-[#EAEAEA] bg-white px-2 py-0.5 text-[11px] font-bold text-primary hover:underline"
                  >
                    {repo.name}
                  </a>
                ))}
              </div>
            ) : null}
            <p className="mt-2 text-xs leading-relaxed text-[#787774]">{item.why}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function extractGithubUsername(document?: CanonicalCvDocument) {
  const links = document?.contact?.links ?? [];
  for (const link of links) {
    try {
      const url = new URL(link.url.startsWith("http") ? link.url : `https://${link.url}`);
      if (!url.hostname.toLowerCase().includes("github.com")) continue;
      const firstSegment = url.pathname.split("/").filter(Boolean)[0]?.replace(/^@/, "") ?? "";
      if (USERNAME_PATTERN.test(firstSegment)) return firstSegment;
    } catch {
      continue;
    }
  }
  return "";
}
