import { useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, Clock, CheckCircle2, Plus, Trash2, Star, MapPin, Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { useMascotSuccess } from "@/hooks/useMascot";
import { WEEKDAYS, AvailabilitySlot } from "@/lib/mock-data/mentor-dashboard";
import { useMentorStore, PricingPlan } from "@/store/useMentorStore";

const TIME_OPTIONS = [
  "06:00","07:00","08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00","19:00",
  "20:00","21:00","22:00","23:00"
];

export default function MentorAvailability() {
  const { myProfile, pricingPlans: initialPricingPlans, updateMyProfile, updatePricingPlans, setPricingSetupCompleted } = useMentorStore();
  const { celebrate } = useMascotSuccess();

  const [pricingPlans, setPricingPlans] = useState(
    initialPricingPlans.length > 0 ? initialPricingPlans : [
      { title: "Quick Plan", price: 50, description: "Perfect for quick architecture reviews or specific bug fixes.\n\n- 1 hour call per month\n- Unlimited Q&A via chat\n- Expect responses in 24 hours or less\n- Hands-on support" }
    ]
  );
  const [slots, setSlots] = useState<AvailabilitySlot[]>(myProfile.availableSlots || []);
  const [showPreview, setShowPreview] = useState(false);

  const addPricingPlan = () => {
    if (pricingPlans.length < 4) {
      setPricingPlans([...pricingPlans, { title: "", price: "", description: "" }]);
    } else {
      toast({ title: "Maximum plans reached", description: "You can only have up to 4 pricing plans." });
    }
  };

  const updatePricingPlan = (idx: number, field: keyof PricingPlan, value: string | number) => {
    setPricingPlans(pricingPlans.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const removePricingPlan = (idx: number) => {
    setPricingPlans(pricingPlans.filter((_, i) => i !== idx));
  };

  const addSlot = () => {
    setSlots([...slots, { day: "Monday", from: "09:00", to: "11:00" }]);
  };

  const updateSlot = (idx: number, field: keyof AvailabilitySlot, value: string) => {
    setSlots(slots.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const removeSlot = (idx: number) => {
    setSlots(slots.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (pricingPlans.length === 0 || pricingPlans.some(p => !p.title || p.price === "" || !p.description)) {
      toast({ title: "Incomplete Pricing", description: "Please fill in all pricing plans correctly.", variant: "destructive" });
      return;
    }
    updateMyProfile({ availableSlots: slots });
    updatePricingPlans(pricingPlans);
    setPricingSetupCompleted(true);
    celebrate("Đã lưu lịch & bảng giá! 🎉");
  };

  return (
    <div className="w-full max-w-none space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-poppins font-bold text-slate-900 dark:text-white">Availability & Pricing</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Set your availability and hourly rate for mentoring sessions</p>
          </div>
          <div className="flex gap-2">
            {/* <Button variant="outline" onClick={() => setShowPreview(true)} className="gap-2">
              <Eye className="w-4 h-4" /> Preview
            </Button> */}
          </div>
        </div>
      </motion.div>

      {/* Pricing */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" /> Pricing Plans
              </CardTitle>
              <Button variant="outline" size="sm" onClick={addPricingPlan} disabled={pricingPlans.length >= 4} className="gap-1.5 text-xs h-8">
                <Plus className="w-3.5 h-3.5" /> Add Plan
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {pricingPlans.length === 0 && (
              <div className="text-center py-6 text-slate-400">
                <p className="text-sm">No pricing plans added. Click "Add Plan" to start.</p>
              </div>
            )}
            {pricingPlans.map((plan, idx) => (
              <div key={idx} className="p-4 bg-slate-50 dark:bg-[#0b1120] rounded-xl border border-slate-100 dark:border-slate-800 relative space-y-4">
                <button
                  onClick={() => removePricingPlan(idx)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mr-8">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Plan Title</Label>
                    <Input
                      value={plan.title}
                      placeholder="e.g., Quick Plan, Technical Plan"
                      onChange={e => updatePricingPlan(idx, "title", e.target.value)}
                      className="border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Price per session (VND)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={plan.price}
                        onChange={e => {
                          const val = e.target.value;
                          updatePricingPlan(idx, "price", val === "" ? "" : Number(val));
                        }}
                        className="pl-8 border-slate-200 dark:border-slate-800 focus:border-emerald-400 font-medium"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</Label>
                  <Textarea
                    value={plan.description}
                    placeholder="Describe what is included in this plan..."
                    onChange={e => updatePricingPlan(idx, "description", e.target.value)}
                    className="border-slate-200 dark:border-slate-800 min-h-[100px]"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">List specific features, response times, or call hours included.</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Availability */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Weekly Availability
              </CardTitle>
              <Button variant="outline" size="sm" onClick={addSlot} className="gap-1.5 text-xs h-8">
                <Plus className="w-3.5 h-3.5" /> Add Time Slot
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {slots.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No time slots assigned. Click "Add Time Slot" to start.</p>
              </div>
            )}
            {slots.map((slot, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 p-3 bg-slate-50 dark:bg-[#0b1120] rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <Select value={slot.day} onValueChange={v => updateSlot(idx, "day", v)}>
                  <SelectTrigger className="h-9 border-slate-200 dark:border-slate-800 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={slot.from} onValueChange={v => updateSlot(idx, "from", v)}>
                  <SelectTrigger className="h-9 border-slate-200 dark:border-slate-800 text-sm w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={slot.to} onValueChange={v => updateSlot(idx, "to", v)}>
                  <SelectTrigger className="h-9 border-slate-200 dark:border-slate-800 text-sm w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => removeSlot(idx)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}

            {/* Visual calendar preview */}
            {slots.length > 0 && (
              <div className="mt-4 p-4 bg-primary/5/50 border border-emerald-100 rounded-xl">
                <p className="text-xs font-bold text-primary/90 mb-3"> Your weekly schedule summary</p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map(day => {
                    const daySlots = slots.filter(s => s.day === day);
                    return daySlots.length > 0 ? (
                      <div key={day} className="bg-white dark:bg-slate-900 border border-primary/20 rounded-xl px-3 py-2 min-w-[100px]">
                        <p className="text-xs font-bold text-primary/90 mb-1">{day.slice(0, 3)}</p>
                        {daySlots.map((s, i) => (
                          <p key={i} className="text-[11px] text-slate-600 dark:text-slate-400">{s.from} – {s.to}</p>
                        ))}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Button */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex justify-end pt-4">
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 gap-2 px-8">
          <CheckCircle2 className="w-4 h-4" /> Save
        </Button>
      </motion.div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white"> Preview your profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">This is how students will see your profile on the mentor search page.</p>
            
            {/* Mock mentor card preview */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-start gap-4">
                <Avatar className="w-14 h-14 ring-4 ring-slate-100">
                  <AvatarFallback className="bg-primary text-white font-bold text-lg">NM</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-white">{myProfile.name}</h3>
                    <Badge className="bg-primary/10 text-primary/90 border-0 text-[10px]"> Verified</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{myProfile.headline}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-amber-500 font-bold"><Star className="w-3 h-3 fill-amber-400" /> 4.8</span>
                    <span className="flex items-center gap-1 text-xs text-slate-400"><Briefcase className="w-3 h-3" /> 124 sessions</span>
                    <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin className="w-3 h-3" /> TP.HCM</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {myProfile.skills.slice(0, 5).map(skill => (
                  <Badge key={skill} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-0 text-[10px]">{skill}</Badge>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[11px] text-slate-400">Starting from</p>
                  <p className="font-black text-slate-900 dark:text-white">${pricingPlans.length > 0 ? pricingPlans[0].price.toLocaleString() : 0}</p>
                </div>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs">
                  Connect now
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
