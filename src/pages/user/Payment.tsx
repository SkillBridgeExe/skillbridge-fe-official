import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, CreditCard, ShieldCheck, Lock, Info, ChevronRight, Globe, AlertCircle, CalendarClock } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useMascotLoading, useMascotSuccess } from "@/hooks/useMascot";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

export default function Payment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const { show: showLoading } = useMascotLoading();
  const { celebrate } = useMascotSuccess();

  const mentor = searchParams.get("mentor") || "Mentor";
  const pkg = searchParams.get("package") || "Selected Package";
  const price = searchParams.get("price") || "0";
  
  const totalPriceNum = parseFloat(price) || 0;
  const depositAmount = (totalPriceNum * 0.1).toFixed(2);
  const remainingAmount = (totalPriceNum * 0.9).toFixed(2);

  const handlePayment = () => {
    setIsProcessing(true);
    showLoading("Đang xử lý thanh toán...");
    setTimeout(() => {
      setIsProcessing(false);
      // DEMO ONLY: no payment processor is wired. celebrate() transitions the
      // loading overlay into the success dolphin, then auto-dismisses itself.
      celebrate(`Demo: đặt lịch thử với ${mentor}`);
      toast({
        title: "Demo booking confirmed",
        description: `This is a demo — no payment was processed and no real booking was made with ${mentor}.`,
      });
      navigate(`/mentor-connect?mentor=${encodeURIComponent(mentor || "")}`);
    }, 2500);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-7 py-12">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center space-y-2"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FBF3DB] text-[#956400] rounded-full text-[10px] font-bold uppercase tracking-widest border border-[#F1E5C0]">
            <Info className="w-3 h-3" /> Demo checkout — no real charge
          </div>
          <h1 className="text-4xl font-poppins font-bold text-slate-900">Complete Your Booking</h1>
          <p className="text-slate-500 max-w-xl mx-auto">Confirm your mentorship package and secure your spot with {mentor}.</p>
        </motion.header>

        <div className="mb-8 flex items-start gap-3 rounded-xl border border-[#F1E5C0] bg-[#FBF3DB] px-4 py-3 text-[#956400]">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium leading-relaxed">
            This is a <strong>demo</strong> checkout — it is not connected to a real payment processor.
            No card is charged and no booking is actually created.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-8"
          >
            <Card className="glass border-white/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Payment Details</CardTitle>
                    <CardDescription>Select your preferred payment method</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4 opacity-60" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 opacity-60" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border-2 border-primary bg-primary/5 rounded-2xl flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <span className="font-bold text-slate-900">Credit Card</span>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="p-4 border border-slate-200 bg-white rounded-2xl flex items-center justify-between opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-slate-400" />
                      <span className="font-bold text-slate-400">PayPal / Other</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="card-name" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cardholder Name</Label>
                    <Input id="card-name" placeholder="John Doe" className="h-12 rounded-xl border-slate-200 focus:ring-primary/20" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="card-number" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Card Number</Label>
                    <div className="relative">
                       <Input id="card-number" placeholder="**** **** **** ****" className="h-12 rounded-xl border-slate-200 pl-12 focus:ring-primary/20" />
                       <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="expiry" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry Date</Label>
                      <Input id="expiry" placeholder="MM/YY" className="h-12 rounded-xl border-slate-200 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv" className="text-xs font-bold text-slate-500 uppercase tracking-wider">CVV</Label>
                      <Input id="cvv" placeholder="123" className="h-12 rounded-xl border-slate-200 focus:ring-primary/20" />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between text-slate-400">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> PCI DSS Compliant
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                    <Lock className="w-4 h-4 text-emerald-500" /> SSL Encrypted
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
                    <Info className="w-4 h-4 text-primary" /> Refund Protected
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-4 p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden group">
               <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
                  <ShieldCheck className="w-32 h-32" />
               </div>
               <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6 text-primary" />
               </div>
               <div>
                  <h4 className="font-bold">SkillBridge Guarantee</h4>
                  <p className="text-xs text-white/60">If you're not satisfied with the session, we'll refund 100% of your payment within 24 hours.</p>
               </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <Card className="glass border-white/50 shadow-xl overflow-hidden sticky top-24">
              <CardHeader className="bg-slate-900 text-white p-8">
                <CardTitle className="text-white text-xl">Order Summary</CardTitle>
                <CardDescription className="text-white/60">Review your booking details</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8 bg-white">
                <div className="space-y-6">
                  <div className="flex gap-4">
                     <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0">
                        <img src={`https://i.pravatar.cc/150?u=${mentor.toLowerCase().replace(" ", "")}`} alt={mentor} className="w-full h-full object-cover" />
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold leading-none">Mentor</p>
                        <p className="text-lg font-bold text-slate-900 leading-tight">{mentor}</p>
                        <p className="text-xs text-primary font-medium">Industry Expert</p>
                     </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Selected Plan</p>
                    <p className="font-bold text-slate-900">{pkg}</p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                     <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                        <span>Total Package Price</span>
                        <span>${price}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm font-bold text-slate-900 bg-amber-50 p-2 rounded-lg">
                        <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Today's Deposit (10%)</span>
                        <span>${depositAmount}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                        <span>Remaining Balance <span className="text-[10px] bg-slate-100 px-1 py-0.5 rounded ml-1">Drafted on meeting day</span></span>
                        <span>${remainingAmount}</span>
                     </div>
                     
                     <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        <span className="text-slate-900 font-black text-lg">Due Now</span>
                        <span className="text-3xl font-black text-primary">${depositAmount}</span>
                     </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800 text-xs">
                  <CalendarClock className="w-5 h-5 shrink-0 text-blue-600" />
                  <div>
                    <p className="font-bold mb-1">How it works</p>
                    <p className="text-blue-700/80 leading-relaxed">
                      You only pay a 10% deposit today to secure your booking. 
                      Our system securely holds the funds. The remaining 90% is drafted on the meeting day. 
                      After the session, {mentor} receives payment (minus a 15% platform commission).
                    </p>
                  </div>
                </div>

                <Button 
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-glow text-lg group transition-all"
                  onClick={handlePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-3">
                       Đang xử lý...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                       Pay Deposit (Demo) <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </Button>
                
                <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold leading-relaxed">
                   By completing this deposit, you agree to our <a href="/terms" className="text-primary hover:underline">Terms of Service</a>.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
