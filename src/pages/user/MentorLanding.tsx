import { useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import {
  Users, Star, DollarSign, Calendar, TrendingUp, CheckCircle2,
  ArrowRight, Sparkles, BookOpen, Video,
  Award, LogOut, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

const LOGO_URL = "https://image2url.com/r2/default/images/1772821810184-bb29e83d-3596-498a-93f2-a1fbdc88b8cc.png";

const HOW_IT_WORKS = [
  { step: "01", title: "Create your mentor profile", desc: "Upload your CV, certificates, and expertise summary. AI helps optimize your profile to attract the right students.", icon: Users },
  { step: "02", title: "Set up services", desc: "Choose your format (1:1 sessions, group classes, async courses) and set hourly or package pricing.", icon: BookOpen },
  { step: "03", title: "Connect and teach", desc: "Receive bookings, run sessions via built-in video or chat, and track learner progress.", icon: Video },
  { step: "04", title: "Get paid", desc: "Receive payments automatically after each session. Supported via VNPay, Momo, or bank transfer.", icon: DollarSign },
];

const BENEFITS = [
  { icon: DollarSign, title: "Passive income", desc: "Create an async course once and sell it without limits. Top mentors earn over ₫50M/month.", color: "bg-emerald-50 text-emerald-600" },
  { icon: Calendar, title: "Flexible schedule", desc: "Set your own availability. Avoid double bookings with the integrated calendar system.", color: "bg-blue-50 text-blue-600" },
  { icon: Sparkles, title: "AI assistance", desc: "AI summarizes sessions, suggests resources, and generates student feedback reports automatically.", color: "bg-violet-50 text-violet-600" },
  { icon: TrendingUp, title: "Detailed analytics", desc: "Track KPIs in your dashboard: students, ratings, revenue, re-booking rate, and growth trends.", color: "bg-amber-50 text-amber-600" },
];

const TOP_MENTORS = [
  { name: "Tran Minh Tuan", specialty: "Senior Frontend @ VNG", students: 847, revenue: "₫52M/month", rating: 4.9, initials: "TM", bg: "from-blue-500 to-cyan-400" },
  { name: "Nguyen Duc Minh", specialty: "AI Engineer @ Shopee", students: 623, revenue: "₫38M/month", rating: 4.8, initials: "NM", bg: "from-violet-500 to-purple-400" },
  { name: "Pham Thanh Hung", specialty: "DevOps Lead @ Tiki", students: 512, revenue: "₫29M/month", rating: 4.8, initials: "PH", bg: "from-emerald-500 to-teal-400" },
];

const EARNINGS_TIERS = [
  { level: "Starter Mentor", range: "₫5M - ₫15M/month", students: "10-30 students", color: "border-slate-200 bg-slate-50" },
  { level: "Pro Mentor", range: "₫15M - ₫35M/month", students: "30-100 students", color: "border-blue-200 bg-blue-50", highlight: true },
  { level: "Expert Mentor", range: "₫35M - ₫80M+/month", students: "100+ students", color: "border-violet-200 bg-violet-50" },
];

const REQUIREMENTS = [
  "At least 2 years of hands-on experience",
  "Strong communication and teaching skills",
  "Minimum commitment of 4 hours/week",
  "Pass an interview with the SkillBridge team",
];

export default function MentorLanding() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".mentor-hero > *", { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: "power3.out", delay: 0.2 });
      gsap.fromTo(".mentor-card", { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.09, duration: 0.5, ease: "power3.out", delay: 0.4 });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={heroRef} className="min-h-screen bg-white font-sans">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 h-16 flex items-center px-6 justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 p-1.5">
            <img src={LOGO_URL} alt="SkillBridge" className="w-full h-full object-contain" />
          </div>
          <span className="font-poppins font-black text-slate-900">SkillBridge</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Mentors</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-800 font-medium">← Back to User Portal</Link>
          <Link to="/mentor-dashboard" className="text-sm bg-emerald-500 text-white font-semibold px-4 py-1.5 rounded-full hover:bg-emerald-600 transition-colors">Mentor Dashboard →</Link>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors font-medium"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </nav>

      <div className="pt-16">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white">
          <div className="absolute top-0 left-1/3 w-[500px] h-[400px] bg-emerald-500/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-teal-500/10 blur-[80px] pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />

          <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
            <div className="max-w-2xl mentor-hero space-y-6">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2">
                <Star className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-300 font-semibold">312 mentors are earning on SkillBridge</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-poppins font-black leading-[1.1] tracking-tight">
                Turn your knowledge<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                  into passive income.
                </span>
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed">
                Share your expertise with thousands of students waiting for mentorship. Flexible schedule, uncapped income.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button className="h-12 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-base shadow-xl">
                  Become a Mentor <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" className="h-12 px-6 rounded-xl border-white/20 text-white hover:bg-white/10 font-medium">
                  View real earnings
                </Button>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-6 pt-2">
                {[
                  { icon: Clock, val: "4h/week", label: "minimum time" },
                  { icon: DollarSign, val: "₫52M/month", label: "top mentor income" },
                  { icon: Users, val: "47,000+", label: "students waiting" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <s.icon className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-sm font-black text-white">{s.val}</div>
                      <div className="text-[10px] text-slate-400">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-poppins font-black text-slate-900 mb-3">Get started in 4 simple steps</h2>
            <p className="text-slate-500">From signup to payment in as fast as 48 hours</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, _i) => (
              <motion.div
                key={step.step}
                className="mentor-card"
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Card className="glass border-white/60 h-full hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl font-black text-slate-100 font-poppins">{step.step}</span>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <step.icon className="w-5 h-5 text-emerald-600" />
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Benefits ── */}
        <section className="bg-slate-50 py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-poppins font-black text-slate-900 mb-3">Why mentors choose SkillBridge</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {BENEFITS.map((b) => (
                <motion.div key={b.title} whileHover={{ y: -3, transition: { duration: 0.2 } }}>
                  <Card className="glass border-white/60 h-full">
                    <CardContent className="p-5">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", b.color)}>
                        <b.icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mb-2">{b.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{b.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Earnings ── */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-poppins font-black text-slate-900 mb-4">
                Real earnings from our mentors
              </h2>
              <p className="text-slate-500 mb-8">
                Based on real Q1 2026 data from 312 active mentors.
              </p>
              <div className="space-y-3">
                {EARNINGS_TIERS.map((tier) => (
                  <div key={tier.level} className={cn("rounded-2xl border-2 p-4", tier.color)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{tier.level}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{tier.students}</div>
                      </div>
                      <div className={cn("text-lg font-black font-poppins", tier.highlight ? "text-blue-600" : "text-slate-700")}>
                        {tier.range}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-4">
                * SkillBridge keeps a 20% commission. 80% of revenue goes to mentors.
              </p>
            </div>

            {/* Top Mentors */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Top mentors this month</h3>
              {TOP_MENTORS.map((m, i) => (
                <motion.div
                  key={m.name}
                  whileHover={{ x: 4, transition: { duration: 0.15 } }}
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all"
                >
                  <div className="relative flex-shrink-0">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold bg-gradient-to-br", m.bg)}>
                      {m.initials}
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border border-slate-100 flex items-center justify-center">
                      <span className="text-[10px] font-black text-slate-600">#{i + 1}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800">{m.name}</div>
                    <div className="text-xs text-slate-400 truncate">{m.specialty}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">{m.students} students</span>
                      <span className="text-xs text-amber-500 font-bold flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400" />{m.rating}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-black text-emerald-600 font-poppins">{m.revenue}</div>
                    <div className="text-[10px] text-slate-400">income</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Requirements ── */}
        <section className="bg-slate-50 py-16">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-poppins font-black text-slate-900 mb-2">Mentor requirements</h2>
            <p className="text-slate-500 text-sm mb-8">We maintain high standards to ensure the best student experience.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-8">
              {REQUIREMENTS.map((r) => (
                <div key={r} className="flex items-start gap-2.5 bg-white rounded-xl p-3.5 border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-600">{r}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-gradient-to-r from-emerald-500 to-teal-500 py-16">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <Award className="w-12 h-12 text-white/60 mx-auto mb-4" />
            <h2 className="text-3xl font-poppins font-black text-white mb-3">
              Ready to get started?
            </h2>
            <p className="text-emerald-100 mb-8">
              Thousands of students are waiting to learn from experts like you.
            </p>
            <Button className="h-12 px-10 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 font-bold text-base shadow-xl">
              Become a Mentor Now <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-emerald-200 text-xs mt-3">Profile review in 48 hours • 1:1 onboarding support</p>
          </div>
        </section>
      </div>
    </div>
  );
}
