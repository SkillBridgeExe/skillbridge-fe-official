import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  User, Upload, Plus, Trash2,
  Github, Linkedin, Globe, CheckCircle2, Camera, Bold, Italic
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useMascotSuccess } from "@/hooks/useMascot";
import { TIMEZONES, MONTHS, MONTH_NAMES, YEARS, WorkExperience } from "@/lib/mock-data/mentor-dashboard";
import { useMentorStore } from "@/store/useMentorStore";

export default function MentorProfileSetup() {
  const { myProfile, updateMyProfile, setProfileSetupCompleted } = useMentorStore();
  const { celebrate } = useMascotSuccess();

  // Basic Info
  const [avatarUrl, setAvatarUrl] = useState(myProfile.avatar || "");
  const [headline, setHeadline] = useState(myProfile.headline || "");
  const [location, setLocation] = useState(myProfile.location || "");
  const [timezone, setTimezone] = useState(myProfile.timezone || "");

  // Bio & Expertise
  const [bio, setBio] = useState(myProfile.bio || "");
  const [skills, setSkills] = useState<string[]>(myProfile.skills || []);
  const [skillInput, setSkillInput] = useState("");

  // Work Experience
  const [experiences, setExperiences] = useState<WorkExperience[]>(myProfile.workExperience || []);

  // Social Linkss
  const [linkedin, setLinkedin] = useState(myProfile.socialLinks?.linkedin || "");
  const [github, setGithub] = useState(myProfile.socialLinks?.github || "");
  const [portfolio, setPortfolio] = useState(myProfile.socialLinks?.portfolio || "");

  // Active Toggle
  const [isActive, setIsActive] = useState(myProfile.isActive ?? true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      if (!skills.includes(skillInput.trim())) {
        setSkills([...skills, skillInput.trim()]);
      }
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => setSkills(skills.filter(s => s !== skill));

  const addExperience = () => {
    setExperiences([...experiences, {
      id: `w${Date.now()}`,
      company: "",
      position: "",
      fromMonth: "01",
      fromYear: "2024",
      toMonth: "",
      toYear: "",
      isCurrent: false
    }]);
  };

  const updateExperience = <K extends keyof WorkExperience>(id: string, field: K, value: WorkExperience[K]) => {
    setExperiences(experiences.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeExperience = (id: string) => setExperiences(experiences.filter(e => e.id !== id));

  const handleSave = () => {
    if (!headline || !location || !timezone || !bio || skills.length === 0) {
      toast({ title: "Incomplete Profile", description: "Please fill in all required basic details and at least one skill.", variant: "destructive" });
      return;
    }
    
    updateMyProfile({
      avatar: avatarUrl,
      headline,
      location,
      timezone,
      bio,
      skills,
      workExperience: experiences,
      socialLinks: { linkedin, github, portfolio },
      isActive
    });
    setProfileSetupCompleted(true);
    celebrate("Đã lưu hồ sơ thành công! 🎉");
  };

  return (
    <div className="w-full max-w-none space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-poppins font-bold text-slate-900 dark:text-white">Profile</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">These details will be displayed on the student's Mentor search page</p>
          </div>
        </div>
      </motion.div>

      {/* Active Status */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className={cn("border-2 transition-all", isActive ? "border-primary/20 bg-primary/5/50" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b1120]")}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Mentee Acceptance Status</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {isActive ? "Profile is visible & receiving New Requests" : "⏸️ Profile hidden from search"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-slate-400")}>
                {isActive ? "Active" : "Paused"}
              </span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Basic Info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
          <CardHeader><CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Basic Details</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="relative group">
                <Avatar className="w-20 h-20 ring-4 ring-slate-100">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-primary text-white font-bold text-2xl">NM</AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="w-4 h-4" /> Upload photo
                </Button>
                <p className="text-xs text-slate-400 mt-1.5">JPG, PNG. Max 5MB.</p>
              </div>
            </div>

            {/* Headline */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Headline <span className="text-red-400">*</span></Label>
              <Input
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                placeholder="Ex: Senior Frontend Engineer at Google | 5 Years React experience"
                className="border-slate-200 dark:border-slate-800 focus:border-primary"
              />
              <p className="text-xs text-slate-400">{headline.length}/100 characters</p>
            </div>

            {/* Location & Timezone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">City / Location</Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Ho Chi Minh City, Vietnam" className="border-slate-200 dark:border-slate-800 focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Timezone <span className="text-red-400">*</span></Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="border-slate-200 dark:border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bio & Expertise */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
          <CardHeader><CardTitle className="text-base font-bold text-slate-900 dark:text-white"> About & Expertise</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Bio */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">About Me (Bio)</Label>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 dark:bg-[#0b1120] border-b border-slate-200 dark:border-slate-800">
                  <button className="p-1 rounded hover:bg-slate-200 dark:bg-slate-800 transition-colors" title="Bold">
                    <Bold className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <button className="p-1 rounded hover:bg-slate-200 dark:bg-slate-800 transition-colors" title="Italic">
                    <Italic className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
                <Textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Write an introduction about yourself, your mentoring style, and what students will get..."
                  className="border-0 rounded-none min-h-32 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <p className="text-xs text-slate-400">{bio.length} characters</p>
            </div>

            {/* Skills */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Skills / Tags</Label>
              <div className="flex flex-wrap gap-2 p-3 border border-slate-200 dark:border-slate-800 rounded-xl min-h-12 focus-within:border-primary transition-colors">
                {skills.map(skill => (
                  <Badge
                    key={skill}
                    className="bg-primary/5 text-primary/90 border border-primary/20 gap-1.5 pr-1.5 hover:bg-primary/10 cursor-default"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="w-3.5 h-3.5 rounded-full bg-primary hover:bg-red-200 hover:text-red-600 flex items-center justify-center transition-colors text-primary/90 text-[10px] font-bold"
                    >×</button>
                  </Badge>
                ))}
                <input
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={handleAddSkill}
                  placeholder="Enter skills, press Enter to add..."
                  className="flex-1 min-w-32 text-sm outline-none bg-transparent placeholder-slate-400"
                />
              </div>
              <p className="text-xs text-slate-400">Press <kbd className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">Enter</kbd> to add tag</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Work Experience */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white"> Work Experience</CardTitle>
              <Button variant="outline" size="sm" onClick={addExperience} className="gap-1.5 text-xs h-8">
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {experiences.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">not available experience nào. Nhấn "Add" để bắt đầu.</p>
            )}
            {experiences.map((exp, idx) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50 dark:bg-[#0b1120]/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">#{idx + 1}</span>
                  <button onClick={() => removeExperience(exp.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Company Name</Label>
                    <Input
                      value={exp.company}
                      onChange={e => updateExperience(exp.id, "company", e.target.value)}
                      placeholder="VD: Google, VNG, Tiki..."
                      className="h-9 border-slate-200 dark:border-slate-800 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Position</Label>
                    <Input
                      value={exp.position}
                      onChange={e => updateExperience(exp.id, "position", e.target.value)}
                      placeholder="VD: Senior Engineer, Team Lead..."
                      className="h-9 border-slate-200 dark:border-slate-800 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">From</Label>
                    <div className="flex gap-1.5">
                      <Select value={exp.fromMonth} onValueChange={v => updateExperience(exp.id, "fromMonth", v)}>
                        <SelectTrigger className="h-9 border-slate-200 dark:border-slate-800 text-sm flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={m}>{MONTH_NAMES[i]}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={exp.fromYear} onValueChange={v => updateExperience(exp.id, "fromYear", v)}>
                        <SelectTrigger className="h-9 border-slate-200 dark:border-slate-800 text-sm flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">To</Label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exp.isCurrent}
                          onChange={e => updateExperience(exp.id, "isCurrent", e.target.checked)}
                          className="rounded"
                        />
                        Present
                      </label>
                    </div>
                    {!exp.isCurrent ? (
                      <div className="flex gap-1.5">
                        <Select value={exp.toMonth} onValueChange={v => updateExperience(exp.id, "toMonth", v)}>
                          <SelectTrigger className="h-9 border-slate-200 dark:border-slate-800 text-sm flex-1"><SelectValue placeholder="Month" /></SelectTrigger>
                          <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={m}>{MONTH_NAMES[i]}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={exp.toYear} onValueChange={v => updateExperience(exp.id, "toYear", v)}>
                          <SelectTrigger className="h-9 border-slate-200 dark:border-slate-800 text-sm flex-1"><SelectValue placeholder="Year" /></SelectTrigger>
                          <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="h-9 flex items-center px-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <span className="text-xs text-primary/90 font-semibold">Currently working here</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Social Linkss */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
          <CardHeader><CardTitle className="text-base font-bold text-slate-900 dark:text-white"> Social Media & Links</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { icon: Linkedin, label: "LinksedIn", value: linkedin, onChange: setLinkedin, placeholder: "https://linkedin.com/in/yourprofile", color: "text-blue-600" },
              { icon: Github, label: "GitHub", value: github, onChange: setGithub, placeholder: "https://github.com/yourusername", color: "text-slate-800 dark:text-slate-200" },
              { icon: Globe, label: "Portfolio / Website", value: portfolio, onChange: setPortfolio, placeholder: "https://yourwebsite.com", color: "text-violet-600" },
            ].map(({ icon: Icon, label, value, onChange, placeholder, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0", color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</Label>
                  <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-9 border-slate-200 dark:border-slate-800 text-sm" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 shadow-md px-8 gap-2">
          <CheckCircle2 className="w-4 h-4" /> Save Profile
        </Button>
      </div>
    </div>
  );
}
