import { useRef, useState } from "react";
import type { CvListItemDto, CvMatchDto } from "@shared/api";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  FileUp,
  ListChecks,
  Mic,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
  Type,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { INTERVIEW_SETUP_TIPS } from "@/constants/interview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  AVAILABLE_LANGUAGES,
  AVAILABLE_TARGET_ROLES,
  INTERVIEW_SPEECH_SPEED_OPTIONS,
  INTERVIEW_VOICE_OPTIONS,
  TIP_ICONS,
  type InterviewMode,
  type InterviewSpeechSpeed,
  type InterviewType,
  type InterviewVoice,
} from "./types";
import { getInterviewQuestionBankSourceKind } from "./interview-view-model";

interface InterviewCvUploadInput {
  file: File;
  targetRole?: string;
  title?: string;
  consentAccepted: boolean;
}

type InterviewJdMatchInput =
  | {
      kind: "paste";
      cvId: string;
      jdText: string;
      title?: string;
      targetRole?: string;
    }
  | {
      kind: "file";
      cvId: string;
      file: File;
      title?: string;
      targetRole?: string;
    };

interface InterviewSetupProps {
  tipsExpanded: boolean;
  setTipsExpanded: (v: boolean) => void;
  onStart: () => void;
  isLoading: boolean;
  cvItems: CvListItemDto[];
  selectedCvId: string | null;
  setSelectedCvId: (v: string | null) => void;
  isCvLoading: boolean;
  matchItems: CvMatchDto[];
  selectedMatchId: string | null;
  setSelectedMatchId: (v: string | null) => void;
  isMatchesLoading: boolean;
  targetRole: string;
  setTargetRole: (v: string) => void;
  selectedLanguage: "vi" | "en";
  setSelectedLanguage: (v: "vi" | "en") => void;
  interviewMode: InterviewMode;
  setInterviewMode: (v: InterviewMode) => void;
  interviewType: InterviewType;
  setInterviewType: (v: InterviewType) => void;
  selectedVoice: InterviewVoice;
  setSelectedVoice: (v: InterviewVoice) => void;
  speechSpeed: InterviewSpeechSpeed;
  setSpeechSpeed: (v: InterviewSpeechSpeed) => void;
  onUploadCvForInterview: (input: InterviewCvUploadInput) => void;
  isUploadingCv: boolean;
  onCreateCvMatchForInterview: (input: InterviewJdMatchInput) => void;
  isCreatingCvMatch: boolean;
}

export function InterviewSetup({
  tipsExpanded,
  setTipsExpanded,
  onStart,
  isLoading,
  cvItems,
  selectedCvId,
  setSelectedCvId,
  isCvLoading,
  matchItems,
  selectedMatchId,
  setSelectedMatchId,
  isMatchesLoading,
  targetRole,
  setTargetRole,
  selectedLanguage,
  setSelectedLanguage,
  interviewMode,
  setInterviewMode,
  interviewType,
  setInterviewType,
  selectedVoice,
  setSelectedVoice,
  speechSpeed,
  setSpeechSpeed,
  onUploadCvForInterview,
  isUploadingCv,
  onCreateCvMatchForInterview,
  isCreatingCvMatch,
}: InterviewSetupProps) {
  const { t, i18n } = useTranslation("common");
  const cvInputRef = useRef<HTMLInputElement>(null);
  const jdFileInputRef = useRef<HTMLInputElement>(null);
  const [cvUploadFile, setCvUploadFile] = useState<File | null>(null);
  const [cvConsentAccepted, setCvConsentAccepted] = useState(false);
  const [showJdComposer, setShowJdComposer] = useState(false);
  const [jdInputMode, setJdInputMode] = useState<"paste" | "file">("paste");
  const [jdText, setJdText] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const selectedCv = cvItems.find((cv) => cv.id === selectedCvId);
  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const formatDate = (value: string | null | undefined): string => {
    if (!value) return t("interview.history.unknownDate");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("interview.history.unknownDate");
    return new Intl.DateTimeFormat(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };
  const roleLabel = (value: string): string =>
    t(`interview.roles.${value}`, {
      defaultValue:
        AVAILABLE_TARGET_ROLES.find((role) => role.value === value)?.label ??
        value,
    });
  const questionBankSourceKind = getInterviewQuestionBankSourceKind(targetRole);
  const criteriaKeys = [
    "technicalDepth",
    "problemSolving",
    "communication",
    "evidenceCredibility",
    "roleFit",
  ] as const;
  const canUploadCv = Boolean(cvUploadFile && cvConsentAccepted && targetRole);
  const canCreateJdMatch =
    Boolean(selectedCvId) &&
    (jdInputMode === "paste" ? Boolean(jdText.trim()) : Boolean(jdFile));
  const submitCvUpload = () => {
    if (!cvUploadFile || !canUploadCv) return;
    onUploadCvForInterview({
      file: cvUploadFile,
      title: cvUploadFile.name,
      targetRole,
      consentAccepted: cvConsentAccepted,
    });
  };
  const submitJdMatch = () => {
    if (!selectedCvId || !canCreateJdMatch) return;
    if (jdInputMode === "file" && jdFile) {
      onCreateCvMatchForInterview({
        kind: "file",
        cvId: selectedCvId,
        file: jdFile,
        title: jdFile.name,
        targetRole,
      });
      return;
    }

    onCreateCvMatchForInterview({
      kind: "paste",
      cvId: selectedCvId,
      jdText: jdText.trim(),
      targetRole,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-poppins font-bold text-slate-900">
            {t("interview.title")}
          </h1>
          <Badge variant="secondary" className="rounded-full">
            {t("interview.badge.autoScored")}
          </Badge>
        </div>
        <p className="text-sm text-slate-500">
          {t("interview.setup.subtitle")}
        </p>
      </div>

      <Tabs
        value={interviewType}
        onValueChange={(value) => setInterviewType(value as InterviewType)}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="technical">
            {t("interview.setup.type.technical")}
          </TabsTrigger>
          <TabsTrigger value="hr">{t("interview.setup.type.hr")}</TabsTrigger>
          <TabsTrigger value="mixed">
            {t("interview.setup.type.mixed")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="space-y-5">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {t("interview.setup.contextTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("interview.setup.cvLabel")}
                </label>
                {isCvLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={selectedCvId ?? "none"}
                    onValueChange={(value) => {
                      setSelectedCvId(value === "none" ? null : value);
                      setSelectedMatchId(null);
                      setShowJdComposer(false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("interview.setup.useTargetRoleOnly")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {t("interview.setup.noCvTargetRoleOnly")}
                      </SelectItem>
                      {cvItems.map((cv) => (
                        <SelectItem key={cv.id} value={cv.id}>
                          {cv.title ||
                            cv.originalFileName ||
                            `CV ${cv.id.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedCv ? (
                  <p className="text-xs text-slate-500">
                    {t("interview.setup.uploadedAt", {
                      date: formatDate(selectedCv.createdAt),
                    })}
                    {selectedCv.targetRole
                      ? ` · ${roleLabel(selectedCv.targetRole)}`
                      : ""}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    {t("interview.setup.roleOnlyStillAvailable")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("interview.setup.cvJdMatchLabel")}
                </label>
                {isMatchesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={selectedMatchId ?? "none"}
                    onValueChange={(value) =>
                      setSelectedMatchId(value === "none" ? null : value)
                    }
                    disabled={!selectedCvId || matchItems.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          selectedCvId
                            ? t("interview.setup.optionalMatchContext")
                            : t("interview.setup.chooseCvFirst")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {t("interview.setup.noMatchContext")}
                      </SelectItem>
                      {matchItems.map((match) => (
                        <SelectItem key={match.id} value={match.id}>
                          {(
                            match.jobDescription?.title ||
                            t("interview.setup.savedJd")
                          ).slice(0, 54)}
                          {match.overallScore != null
                            ? ` · ${Math.round(match.overallScore)}%`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedCvId &&
                  !isMatchesLoading &&
                  matchItems.length === 0 && (
                    <p className="text-xs text-slate-500">
                      {t("interview.setup.noSavedMatch")}
                    </p>
                  )}
              </div>
              </div>

              {!selectedCvId && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {t("interview.setup.uploadCvTitle")}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {t("interview.setup.uploadCvDescription")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 rounded-xl font-bold"
                      onClick={() => cvInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {t("interview.setup.uploadCvCta")}
                    </Button>
                  </div>
                  <input
                    ref={cvInputRef}
                    className="hidden"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                    onChange={(event) =>
                      setCvUploadFile(event.target.files?.[0] ?? null)
                    }
                  />
                  {cvUploadFile && (
                    <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {cvUploadFile.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(cvUploadFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full"
                          onClick={() => setCvUploadFile(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <label className="flex items-start gap-2 text-xs text-slate-600">
                        <Checkbox
                          checked={cvConsentAccepted}
                          onCheckedChange={(checked) =>
                            setCvConsentAccepted(checked === true)
                          }
                          className="mt-0.5"
                        />
                        <span>{t("interview.setup.cvConsentLabel")}</span>
                      </label>
                      <Button
                        type="button"
                        className="w-full rounded-xl font-bold"
                        disabled={!canUploadCv || isUploadingCv}
                        onClick={submitCvUpload}
                      >
                        {isUploadingCv ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {t("interview.setup.uploadAndUseCv")}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {!selectedCvId ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  {t("interview.setup.jdRequiresCv")}
                </div>
              ) : !isMatchesLoading && matchItems.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {t("interview.setup.addJdTitle")}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {t("interview.setup.addJdDescription")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 rounded-xl font-bold"
                      onClick={() => setShowJdComposer((value) => !value)}
                    >
                      <FileUp className="mr-2 h-4 w-4" />
                      {t("interview.setup.addJdContext")}
                    </Button>
                  </div>

                  {showJdComposer && (
                    <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                      <ToggleGroup
                        type="single"
                        value={jdInputMode}
                        onValueChange={(value) =>
                          value && setJdInputMode(value as "paste" | "file")
                        }
                        className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
                      >
                        <ToggleGroupItem
                          value="paste"
                          className="h-8 rounded-md text-xs font-bold data-[state=on]:bg-white"
                        >
                          <Type className="mr-1.5 h-3.5 w-3.5" />
                          {t("interview.setup.jdPaste")}
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="file"
                          className="h-8 rounded-md text-xs font-bold data-[state=on]:bg-white"
                        >
                          <FileUp className="mr-1.5 h-3.5 w-3.5" />
                          {t("interview.setup.jdUpload")}
                        </ToggleGroupItem>
                      </ToggleGroup>

                      {jdInputMode === "paste" ? (
                        <Textarea
                          value={jdText}
                          onChange={(event) => setJdText(event.target.value)}
                          className="min-h-[120px] resize-none rounded-xl bg-slate-50"
                          placeholder={t("interview.setup.jdPastePlaceholder")}
                        />
                      ) : (
                        <div className="space-y-2">
                          <input
                            ref={jdFileInputRef}
                            className="hidden"
                            type="file"
                            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                            onChange={(event) =>
                              setJdFile(event.target.files?.[0] ?? null)
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full rounded-xl font-bold"
                            onClick={() => jdFileInputRef.current?.click()}
                          >
                            <FileUp className="mr-2 h-4 w-4" />
                            {jdFile
                              ? jdFile.name
                              : t("interview.setup.chooseJdFile")}
                          </Button>
                          <p className="text-xs text-slate-500">
                            {t("interview.setup.jdFileHint")}
                          </p>
                        </div>
                      )}

                      <Button
                        type="button"
                        className="w-full rounded-xl font-bold"
                        disabled={!canCreateJdMatch || isCreatingCvMatch}
                        onClick={submitJdMatch}
                      >
                        {isCreatingCvMatch ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileUp className="mr-2 h-4 w-4" />
                        )}
                        {t("interview.setup.createJdMatch")}
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("interview.setup.targetRole")}
                  </label>
                  <Badge
                    variant={
                      questionBankSourceKind === "curated"
                        ? "default"
                        : "secondary"
                    }
                    className="rounded-full text-[10px]"
                  >
                    {t(
                      `interview.setup.questionBank.${questionBankSourceKind}`,
                    )}
                  </Badge>
                </div>
                <Select value={targetRole} onValueChange={setTargetRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_TARGET_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {roleLabel(role.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("interview.setup.language")}
                </label>
                <ToggleGroup
                  type="single"
                  value={selectedLanguage}
                  onValueChange={(value) =>
                    value && setSelectedLanguage(value as "vi" | "en")
                  }
                  className="justify-start"
                >
                  {AVAILABLE_LANGUAGES.map((lang) => (
                    <ToggleGroupItem
                      key={lang.value}
                      value={lang.value}
                      className="px-5"
                    >
                      {lang.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Badge
                  variant={
                    questionBankSourceKind === "curated"
                      ? "default"
                      : "secondary"
                  }
                  className="rounded-full"
                >
                  <Database className="mr-1.5 h-3.5 w-3.5" />
                  {t(`interview.setup.questionBank.${questionBankSourceKind}`)}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  {t("interview.setup.privacyScoringTitle")}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800">
            <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black text-slate-300 space-y-5">
              <div className="relative w-24 h-24 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.15)]">
                <Camera className="w-10 h-10 text-blue-400/80" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white">
                  {t("interview.setup.cameraTitle")}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {t("interview.setup.cameraDescription")}
                </p>
              </div>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
                  <ListChecks className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <CardTitle className="text-sm">
                    {t("interview.setup.criteriaTitle")}
                  </CardTitle>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {t("interview.setup.criteriaDescription", {
                      role: roleLabel(targetRole),
                      type: t(`interview.setup.type.${interviewType}`),
                    })}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {criteriaKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-start gap-2 rounded-lg bg-slate-50 p-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-xs font-semibold leading-relaxed text-slate-700">
                      {t(`interview.setup.criteria.${key}`)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3">
                  <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {t(
                        `interview.setup.questionBank.${questionBankSourceKind}Title`,
                      )}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      {t(
                        `interview.setup.questionBank.${questionBankSourceKind}Description`,
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {t("interview.setup.privacyScoringTitle")}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      {t("interview.setup.privacyScoringDescription")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <button
              type="button"
              onClick={() => setTipsExpanded(!tipsExpanded)}
              className="flex items-center justify-between w-full text-left"
            >
              <CardTitle className="text-sm uppercase tracking-wider">
                {t("interview.setup.tipsTitle")}
              </CardTitle>
              {tipsExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            {tipsExpanded &&
              INTERVIEW_SETUP_TIPS.map((tip) => {
                const TipIcon = TIP_ICONS[tip.icon] || Video;
                return (
                  <div key={tip.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <TipIcon className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">
                        {t(`interview.setup.tips.${tip.id}.title`, {
                          defaultValue: tip.title,
                        })}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {t(`interview.setup.tips.${tip.id}.description`, {
                          defaultValue: tip.desc,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}

            <div className="pt-1">
              <ToggleGroup
                type="single"
                value={interviewMode}
                onValueChange={(value) =>
                  value && setInterviewMode(value as InterviewMode)
                }
                className="grid grid-cols-1 gap-2 rounded-lg bg-slate-100 p-1"
              >
                <ToggleGroupItem
                  value="guided"
                  className="h-auto justify-start gap-3 rounded-md px-3 py-3 text-left data-[state=on]:bg-white"
                >
                  <Mic className="h-4 w-4 shrink-0" />
                  <span>
                    <span className="block text-xs font-bold">
                      {t("interview.setup.modes.guided.title")}
                    </span>
                    <span className="block text-[11px] font-medium text-slate-500">
                      {t("interview.setup.modes.guided.description")}
                    </span>
                  </span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="realtime"
                  className="h-auto justify-start gap-3 rounded-md px-3 py-3 text-left data-[state=on]:bg-white"
                >
                  <Radio className="h-4 w-4 shrink-0" />
                  <span>
                    <span className="block text-xs font-bold">
                      {t("interview.setup.modes.realtime.title")}
                    </span>
                    <span className="block text-[11px] font-medium text-slate-500">
                      {t("interview.setup.modes.realtime.description")}
                    </span>
                  </span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-3">
              <div className="mb-3">
                <p className="text-xs font-bold text-slate-800">
                  {t("interview.setup.voice.title")}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  {t("interview.setup.voice.description")}
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {t("interview.setup.voice.voiceLabel")}
                  </label>
                  <Select
                    value={selectedVoice}
                    onValueChange={(value) =>
                      setSelectedVoice(value as InterviewVoice)
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVIEW_VOICE_OPTIONS.map((voice) => (
                        <SelectItem key={voice.value} value={voice.value}>
                          {t(`interview.setup.voice.voices.${voice.i18nKey}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {t("interview.setup.voice.speedLabel")}
                  </label>
                  <ToggleGroup
                    type="single"
                    value={String(speechSpeed)}
                    onValueChange={(value) => {
                      if (!value) return;
                      setSpeechSpeed(Number(value) as InterviewSpeechSpeed);
                    }}
                    className="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1"
                    disabled={isLoading}
                  >
                    {INTERVIEW_SPEECH_SPEED_OPTIONS.map((speed) => (
                      <ToggleGroupItem
                        key={speed.value}
                        value={String(speed.value)}
                        className="h-8 rounded-md px-1 text-[11px] font-bold data-[state=on]:bg-white"
                      >
                        {t(`interview.setup.voice.speeds.${speed.i18nKey}`)}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className={cn(
                "w-full rounded-xl text-white font-bold text-sm h-11",
                isLoading && "opacity-70 cursor-not-allowed",
              )}
              onClick={onStart}
              disabled={isLoading || !targetRole}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />{" "}
                  {t("interview.setup.starting")}
                </>
              ) : interviewMode === "realtime" ? (
                <>
                  <Radio className="w-4 h-4 mr-2" />{" "}
                  {t("interview.setup.startLiveRealtime")}
                </>
              ) : interviewMode === "guided" ? (
                <>
                  <Mic className="w-4 h-4 mr-2" />{" "}
                  {t("interview.setup.startGuidedVoice")}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />{" "}
                  {t("interview.setup.startInterview")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
