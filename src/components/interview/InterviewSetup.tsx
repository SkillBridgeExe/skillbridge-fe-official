import { useRef, useState, useEffect } from "react";
import type { CvListItemDto, CvMatchDto } from "@shared/api";
import {
  Camera,
  FileUp,
  ListChecks,
  Mic,
  Play,
  Radio,
  RefreshCw,
  Type,
  Upload,
  Video,
  X,
  Target,
  FileText,
  Lightbulb,
  Code,
  MessageSquare,
  Briefcase,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const [showTipsModal, setShowTipsModal] = useState(false);
  
  // Custom context choice state for the Progressive Disclosure UI
  const [contextChoice, setContextChoice] = useState<"role" | "cv" | "match">(
    selectedMatchId ? "match" : selectedCvId ? "cv" : "role"
  );

  // Sync choice card if selectedCvId changes externally
  useEffect(() => {
    if (selectedMatchId) setContextChoice("match");
    else if (selectedCvId) setContextChoice("cv");
  }, [selectedCvId, selectedMatchId]);

  const handleContextChange = (val: "role" | "cv" | "match") => {
    setContextChoice(val);
    if (val === "role") {
      setSelectedCvId(null);
      setSelectedMatchId(null);
    } else if (val === "cv") {
      setSelectedMatchId(null);
    }
  };

  const _selectedCv = cvItems.find((cv) => cv.id === selectedCvId);
  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const _formatDate = (value: string | null | undefined): string => {
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
  
  const criteriaData = [
    { key: "technicalDepth", icon: Code },
    { key: "problemSolving", icon: Lightbulb },
    { key: "communication", icon: MessageSquare },
    { key: "evidenceCredibility", icon: FileText },
    { key: "roleFit", icon: Briefcase },
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        {/* LEFT COLUMN: Main Setup Flow */}
        <div className="space-y-6">
          
          {/* Card 1: Goal & Context */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                {t("interview.setup.progressive.goalAndContext")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
              
              {/* Row 1: Role & Language */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="flex h-6 items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("interview.setup.targetRole")}
                    <Badge variant={questionBankSourceKind === "curated" ? "default" : "secondary"} className="rounded-full text-[9px] px-1.5 py-0">
                      {t(`interview.setup.questionBank.${questionBankSourceKind}`)}
                    </Badge>
                  </label>
                  <Select value={targetRole} onValueChange={setTargetRole}>
                    <SelectTrigger className="h-11">
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
                  <label className="flex h-6 items-center text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("interview.setup.language")}
                  </label>
                  <ToggleGroup
                    type="single"
                    value={selectedLanguage}
                    onValueChange={(value) =>
                      value && setSelectedLanguage(value as "vi" | "en")
                    }
                    className="justify-start gap-2"
                  >
                    {AVAILABLE_LANGUAGES.map((lang) => (
                      <ToggleGroupItem
                        key={lang.value}
                        value={lang.value}
                        className="px-6 h-11 data-[state=on]:bg-primary data-[state=on]:text-white transition-colors"
                      >
                        {lang.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>

              {/* Row 2: Progressive Context Choice Cards */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t("interview.setup.progressive.dataSource")}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div 
                    className={cn("border rounded-xl p-3 cursor-pointer transition-all duration-200 text-left", contextChoice === "role" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-slate-200 hover:border-slate-300 bg-white")}
                    onClick={() => handleContextChange("role")}
                  >
                    <Target className={cn("w-5 h-5 mb-2", contextChoice === "role" ? "text-primary" : "text-slate-400")} />
                    <p className="text-sm font-bold text-slate-900">{t("interview.setup.progressive.roleOnly.title")}</p>
                    <p className="text-xs text-slate-500 mt-1">{t("interview.setup.progressive.roleOnly.desc")}</p>
                  </div>
                  
                  <div 
                    className={cn("border rounded-xl p-3 cursor-pointer transition-all duration-200 text-left", contextChoice === "cv" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-slate-200 hover:border-slate-300 bg-white")}
                    onClick={() => handleContextChange("cv")}
                  >
                    <FileText className={cn("w-5 h-5 mb-2", contextChoice === "cv" ? "text-primary" : "text-slate-400")} />
                    <p className="text-sm font-bold text-slate-900">{t("interview.setup.progressive.cv.title")}</p>
                    <p className="text-xs text-slate-500 mt-1">{t("interview.setup.progressive.cv.desc")}</p>
                  </div>
                  
                  <div 
                    className={cn("border rounded-xl p-3 cursor-pointer transition-all duration-200 text-left", contextChoice === "match" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-slate-200 hover:border-slate-300 bg-white")}
                    onClick={() => handleContextChange("match")}
                  >
                    <FileUp className={cn("w-5 h-5 mb-2", contextChoice === "match" ? "text-primary" : "text-slate-400")} />
                    <p className="text-sm font-bold text-slate-900">{t("interview.setup.progressive.match.title")}</p>
                    <p className="text-xs text-slate-500 mt-1">{t("interview.setup.progressive.match.desc")}</p>
                  </div>
                </div>

                {/* Expanded progressive forms based on choice */}
                {contextChoice !== "role" && (
                  <div className="mt-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-5 animate-in slide-in-from-top-2 duration-300">
                    
                    {/* CV Selection / Upload Block */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">1</span>
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
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder={t("interview.setup.progressive.cvPlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              {t("interview.setup.progressive.cvSelectEmpty")}
                            </SelectItem>
                            {cvItems.map((cv) => (
                              <SelectItem key={cv.id} value={cv.id}>
                                {cv.title || cv.originalFileName || `CV ${cv.id.slice(0, 8)}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {!selectedCvId && (
                        <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{t("interview.setup.progressive.uploadNewCv")}</p>
                              <p className="text-xs text-slate-500">{t("interview.setup.progressive.cvUploadHint")}</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => cvInputRef.current?.click()}
                            >
                              <Upload className="mr-2 h-3.5 w-3.5" />
                              {t("interview.setup.progressive.chooseFile")}
                            </Button>
                          </div>
                          
                          <input
                            ref={cvInputRef}
                            className="hidden"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                            onChange={(event) => setCvUploadFile(event.target.files?.[0] ?? null)}
                          />
                          
                          {cvUploadFile && (
                            <div className="mt-4 space-y-3 rounded-md bg-slate-50 p-3 border border-slate-100">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-900">{cvUploadFile.name}</p>
                                  <p className="text-xs text-slate-500">{(cvUploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                  onClick={() => setCvUploadFile(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <label className="flex items-start gap-2 text-xs text-slate-600">
                                <Checkbox
                                  checked={cvConsentAccepted}
                                  onCheckedChange={(checked) => setCvConsentAccepted(checked === true)}
                                  className="mt-0.5"
                                />
                                <span>{t("interview.setup.cvConsentLabel")}</span>
                              </label>
                              <Button
                                type="button"
                                className="w-full h-8 text-xs font-bold"
                                disabled={!canUploadCv || isUploadingCv}
                                onClick={submitCvUpload}
                              >
                                {isUploadingCv ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
                                {t("interview.setup.progressive.uploadAndUse")}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* JD Match Selection / Upload Block */}
                    {contextChoice === "match" && (
                      <div className="space-y-3 pt-3 border-t border-slate-200">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">2</span>
                          {t("interview.setup.cvJdMatchLabel")}
                        </label>
                        
                        {!selectedCvId ? (
                          <div className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-500">
                            {t("interview.setup.progressive.requireCvFirst")}
                          </div>
                        ) : (
                          <>
                            {isMatchesLoading ? (
                              <Skeleton className="h-10 w-full" />
                            ) : (
                              <Select
                                value={selectedMatchId ?? "none"}
                                onValueChange={(value) => setSelectedMatchId(value === "none" ? null : value)}
                                disabled={!selectedCvId || matchItems.length === 0}
                              >
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder={t("interview.setup.progressive.matchPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">{t("interview.setup.progressive.matchSelectEmpty")}</SelectItem>
                                  {matchItems.map((match) => (
                                    <SelectItem key={match.id} value={match.id}>
                                      {(match.jobDescription?.title || t("interview.setup.savedJd")).slice(0, 54)}
                                      {match.overallScore != null ? ` · ${Math.round(match.overallScore)}%` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {!selectedMatchId && (
                              <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-4">
                                {!showJdComposer ? (
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-bold text-slate-900">{t("interview.setup.progressive.addNewJd")}</p>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => setShowJdComposer(true)}>
                                      <Type className="mr-2 h-3.5 w-3.5" /> {t("interview.setup.progressive.addJdButton")}
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-3 animate-in fade-in">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-sm font-bold text-slate-900">{t("interview.setup.progressive.enterJd")}</p>
                                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowJdComposer(false)}>
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <ToggleGroup type="single" value={jdInputMode} onValueChange={(v) => v && setJdInputMode(v as "paste" | "file")} className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1">
                                      <ToggleGroupItem value="paste" className="h-8 rounded text-xs font-bold data-[state=on]:bg-white">
                                        <Type className="mr-1.5 h-3 w-3" /> {t("interview.setup.progressive.pasteText")}
                                      </ToggleGroupItem>
                                      <ToggleGroupItem value="file" className="h-8 rounded text-xs font-bold data-[state=on]:bg-white">
                                        <FileUp className="mr-1.5 h-3 w-3" /> {t("interview.setup.progressive.uploadFileText")}
                                      </ToggleGroupItem>
                                    </ToggleGroup>
                                    
                                    {jdInputMode === "paste" ? (
                                      <Textarea value={jdText} onChange={(e) => setJdText(e.target.value)} className="min-h-[100px] resize-none bg-slate-50 text-xs" placeholder={t("interview.setup.jdPastePlaceholder")} />
                                    ) : (
                                      <div className="space-y-2">
                                        <input ref={jdFileInputRef} className="hidden" type="file" accept=".pdf,.docx,.txt" onChange={(e) => setJdFile(e.target.files?.[0] ?? null)} />
                                        <Button type="button" variant="outline" className="w-full h-9 text-xs" onClick={() => jdFileInputRef.current?.click()}>
                                          <FileUp className="mr-2 h-3 w-3" /> {jdFile ? jdFile.name : t("interview.setup.chooseJdFile")}
                                        </Button>
                                      </div>
                                    )}

                                    <Button type="button" className="w-full h-8 text-xs font-bold" disabled={!canCreateJdMatch || isCreatingCvMatch} onClick={submitJdMatch}>
                                      {isCreatingCvMatch ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <ListChecks className="mr-2 h-3 w-3" />}
                                      {t("interview.setup.progressive.analyzeJdButton")}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Mode & Voice Setup */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mic className="w-4 h-4 text-primary" />
                {t("interview.setup.progressive.modeAndVoice")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
              <ToggleGroup
                type="single"
                value={interviewMode}
                onValueChange={(value) => value && setInterviewMode(value as InterviewMode)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <ToggleGroupItem
                  value="guided"
                  className="h-auto justify-start items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:ring-1 data-[state=on]:ring-primary/20 transition-all hover:border-slate-300"
                >
                  <div className="mt-0.5 bg-slate-100 p-1.5 rounded-md text-slate-600">
                    <Mic className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-slate-900">
                      {t("interview.setup.modes.guided.title")}
                    </span>
                    <span className="block text-[11px] mt-1 font-medium text-slate-500 leading-relaxed">
                      {t("interview.setup.modes.guided.description")}
                    </span>
                  </div>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="realtime"
                  className="h-auto justify-start items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:ring-1 data-[state=on]:ring-primary/20 transition-all hover:border-slate-300"
                >
                  <div className="mt-0.5 bg-slate-100 p-1.5 rounded-md text-slate-600">
                    <Radio className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-slate-900">
                      {t("interview.setup.modes.realtime.title")}
                    </span>
                    <span className="block text-[11px] mt-1 font-medium text-slate-500 leading-relaxed">
                      {t("interview.setup.modes.realtime.description")}
                    </span>
                  </div>
                </ToggleGroupItem>
              </ToggleGroup>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("interview.setup.progressive.voiceLabel")}
                  </label>
                  <Select value={selectedVoice} onValueChange={(value) => setSelectedVoice(value as InterviewVoice)} disabled={isLoading}>
                    <SelectTrigger className="h-11">
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
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t("interview.setup.progressive.speedLabel")}
                  </label>
                  <ToggleGroup
                    type="single"
                    value={String(speechSpeed)}
                    onValueChange={(value) => {
                      if (!value) return;
                      setSpeechSpeed(Number(value) as InterviewSpeechSpeed);
                    }}
                    className="flex bg-slate-100 p-1 rounded-lg w-full h-11"
                    disabled={isLoading}
                  >
                    {INTERVIEW_SPEECH_SPEED_OPTIONS.map((speed) => (
                      <ToggleGroupItem
                        key={speed.value}
                        value={String(speed.value)}
                        className="flex-1 h-full rounded-md text-xs font-bold data-[state=on]:bg-white shadow-sm"
                      >
                        {t(`interview.setup.voice.speeds.${speed.i18nKey}`)}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Primary CTA */}
          <Button
            size="lg"
            className={cn(
              "w-full h-14 rounded-xl text-white font-bold text-base shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]",
              isLoading && "opacity-70 cursor-not-allowed"
            )}
            onClick={() => setShowTipsModal(true)}
            disabled={isLoading || !targetRole}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />{" "}
                {t("interview.setup.starting")}
              </>
            ) : interviewMode === "realtime" ? (
              <>
                <Radio className="w-5 h-5 mr-2" />{" "}
                {t("interview.setup.startLiveRealtime")}
              </>
            ) : interviewMode === "guided" ? (
              <>
                <Mic className="w-5 h-5 mr-2" />{" "}
                {t("interview.setup.startGuidedVoice")}
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />{" "}
                {t("interview.setup.startInterview")}
              </>
            )}
          </Button>

        </div>

        {/* RIGHT COLUMN: Previews & Info */}
        <div className="space-y-6">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800">
            <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black text-slate-300 space-y-5">
              <div className="relative w-24 h-24 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.15)]">
                <Camera className="w-10 h-10 text-blue-400/80" />
              </div>
              <div className="text-center px-4">
                <p className="text-sm font-bold text-white">
                  {t("interview.setup.cameraTitle")}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
                  {t("interview.setup.cameraDescription")}
                </p>
              </div>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
                  <ListChecks className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <CardTitle className="text-sm">
                    {t("interview.setup.criteriaTitle")}
                  </CardTitle>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {t("interview.setup.progressive.criteriaIntro", {
                      type: t(`interview.setup.type.${interviewType}`),
                      role: roleLabel(targetRole),
                    })}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {/* Refined Bento List for Criteria */}
              <div className="grid gap-2">
                {criteriaData.map(({ key, icon: Icon }) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="bg-primary/10 p-1.5 rounded-md text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-semibold leading-relaxed text-slate-700">
                      {t(`interview.setup.criteria.${key}`)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Before-start Tips Modal */}
      <Dialog open={showTipsModal} onOpenChange={setShowTipsModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("interview.setup.tipsTitle")}</DialogTitle>
            <DialogDescription>
              {t("interview.setup.tips.dialogDesc")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {INTERVIEW_SETUP_TIPS.map((tip) => {
              const TipIcon = TIP_ICONS[tip.icon] || Video;
              return (
                <div key={tip.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <TipIcon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-tight">
                      {t(`interview.setup.tips.${tip.id}.title`, {
                        defaultValue: tip.title,
                      })}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {t(`interview.setup.tips.${tip.id}.description`, {
                        defaultValue: tip.desc,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTipsModal(false)}
            >
              {t("interview.setup.tips.dialogCancel")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowTipsModal(false);
                onStart();
              }}
            >
              {t("interview.setup.tips.dialogConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
