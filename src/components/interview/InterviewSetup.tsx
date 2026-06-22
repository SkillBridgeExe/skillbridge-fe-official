import type { CvListItemDto, CvMatchDto } from "@shared/api";
import { Camera, ChevronDown, ChevronUp, Mic, Play, Radio, RefreshCw, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { INTERVIEW_SETUP_TIPS } from "@/constants/interview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
}: InterviewSetupProps) {
  const { t, i18n } = useTranslation("common");
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
      defaultValue: AVAILABLE_TARGET_ROLES.find((role) => role.value === value)?.label ?? value,
    });

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
        <p className="text-sm text-slate-500">{t("interview.setup.subtitle")}</p>
      </div>

      <Tabs
        value={interviewType}
        onValueChange={(value) => setInterviewType(value as InterviewType)}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="technical">{t("interview.setup.type.technical")}</TabsTrigger>
          <TabsTrigger value="hr">{t("interview.setup.type.hr")}</TabsTrigger>
          <TabsTrigger value="mixed">{t("interview.setup.type.mixed")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="space-y-5">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("interview.setup.contextTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("interview.setup.useTargetRoleOnly")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("interview.setup.noCvTargetRoleOnly")}</SelectItem>
                      {cvItems.map((cv) => (
                        <SelectItem key={cv.id} value={cv.id}>
                          {cv.title || cv.originalFileName || `CV ${cv.id.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedCv && (
                  <p className="text-xs text-slate-500">
                    {t("interview.setup.uploadedAt", { date: formatDate(selectedCv.createdAt) })}
                    {selectedCv.targetRole ? ` · ${roleLabel(selectedCv.targetRole)}` : ""}
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
                    onValueChange={(value) => setSelectedMatchId(value === "none" ? null : value)}
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
                      <SelectItem value="none">{t("interview.setup.noMatchContext")}</SelectItem>
                      {matchItems.map((match) => (
                        <SelectItem key={match.id} value={match.id}>
                          {(match.jobDescription?.title || t("interview.setup.savedJd")).slice(0, 54)}
                          {match.overallScore != null ? ` · ${Math.round(match.overallScore)}%` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedCvId && !isMatchesLoading && matchItems.length === 0 && (
                  <p className="text-xs text-slate-500">{t("interview.setup.noSavedMatch")}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("interview.setup.targetRole")}
                </label>
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
                  onValueChange={(value) => value && setSelectedLanguage(value as "vi" | "en")}
                  className="justify-start"
                >
                  {AVAILABLE_LANGUAGES.map((lang) => (
                    <ToggleGroupItem key={lang.value} value={lang.value} className="px-5">
                      {lang.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </CardContent>
          </Card>

          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800">
            <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black text-slate-300 space-y-5">
              <div className="relative w-24 h-24 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.15)]">
                <Camera className="w-10 h-10 text-blue-400/80" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white">{t("interview.setup.cameraTitle")}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {t("interview.setup.cameraDescription")}
                </p>
              </div>
            </div>
          </div>
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
                        {t(`interview.setup.tips.${tip.id}.title`, { defaultValue: tip.title })}
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
                onValueChange={(value) => value && setInterviewMode(value as InterviewMode)}
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
                    onValueChange={(value) => setSelectedVoice(value as InterviewVoice)}
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
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> {t("interview.setup.starting")}
                </>
              ) : interviewMode === "realtime" ? (
                <>
                  <Radio className="w-4 h-4 mr-2" /> {t("interview.setup.startLiveRealtime")}
                </>
              ) : interviewMode === "guided" ? (
                <>
                  <Mic className="w-4 h-4 mr-2" /> {t("interview.setup.startGuidedVoice")}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" /> {t("interview.setup.startInterview")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
