import type { CvListItemDto, CvMatchDto } from "@shared/api";
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
  TIP_ICONS,
  type InterviewMode,
  type InterviewType,
} from "./types";
import { INTERVIEW_SETUP_TIPS } from "@/constants/interview";
import { Camera, ChevronDown, ChevronUp, Mic, Play, Radio, RefreshCw, Video } from "lucide-react";

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
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function roleLabel(value: string): string {
  return AVAILABLE_TARGET_ROLES.find((role) => role.value === value)?.label ?? value;
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
}: InterviewSetupProps) {
  const selectedCv = cvItems.find((cv) => cv.id === selectedCvId);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-poppins font-bold text-slate-900">
            AI Mock Interview
          </h1>
          <Badge variant="secondary" className="rounded-full">
            Backend scored
          </Badge>
        </div>
        <p className="text-sm text-slate-500">
          Choose context, pick a voice mode, and fall back to text only if microphone or realtime fails.
        </p>
      </div>

      <Tabs
        value={interviewType}
        onValueChange={(value) => setInterviewType(value as InterviewType)}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="hr">HR</TabsTrigger>
          <TabsTrigger value="mixed">Mixed</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="space-y-5">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Interview Context</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  CV
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
                      <SelectValue placeholder="Use target role only" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No CV - target role only</SelectItem>
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
                    Uploaded {formatDate(selectedCv.createdAt)}
                    {selectedCv.targetRole ? ` · ${roleLabel(selectedCv.targetRole)}` : ""}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  CV/JD Match
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
                        placeholder={selectedCvId ? "Optional match context" : "Choose CV first"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No match context</SelectItem>
                      {matchItems.map((match) => (
                        <SelectItem key={match.id} value={match.id}>
                          {(match.jobDescription?.title || "Saved JD").slice(0, 54)}
                          {match.overallScore != null ? ` · ${Math.round(match.overallScore)}%` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedCvId && !isMatchesLoading && matchItems.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No saved JD match yet. The interview can still use CV + role.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Target Role
                </label>
                <Select value={targetRole} onValueChange={setTargetRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_TARGET_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Language
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
                <p className="text-sm font-bold text-white">Camera starts only when you begin</p>
                <p className="text-xs text-slate-400 mt-1">
                  No microphone or camera permission is requested on setup load.
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
              <CardTitle className="text-sm uppercase tracking-wider">Things to know</CardTitle>
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
                  <div key={tip.title} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <TipIcon className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{tip.title}</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{tip.desc}</p>
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
                    <span className="block text-xs font-bold">Guided Voice</span>
                    <span className="block text-[11px] font-medium text-slate-500">
                      Backend controls questions, AI reads them aloud.
                    </span>
                  </span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="realtime"
                  className="h-auto justify-start gap-3 rounded-md px-3 py-3 text-left data-[state=on]:bg-white"
                >
                  <Radio className="h-4 w-4 shrink-0" />
                  <span>
                    <span className="block text-xs font-bold">Live Realtime</span>
                    <span className="block text-[11px] font-medium text-slate-500">
                      gpt-realtime-2 speaks and listens like a live interviewer.
                    </span>
                  </span>
                </ToggleGroupItem>
              </ToggleGroup>
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
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Starting...
                </>
              ) : interviewMode === "realtime" ? (
                <>
                  <Radio className="w-4 h-4 mr-2" /> Start Live Realtime
                </>
              ) : interviewMode === "guided" ? (
                <>
                  <Mic className="w-4 h-4 mr-2" /> Start Guided Voice
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" /> Start Interview
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
