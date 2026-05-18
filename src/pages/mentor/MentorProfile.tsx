import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Star, MapPin, Clock, MessageSquare, Heart, Linkedin,
  BadgeCheck, Zap, GraduationCap, Languages, CheckCircle2,
  ArrowRight, ChevronLeft, ThumbsUp, Calendar, Shield,
  Briefcase, Users, TrendingUp, BookOpen
} from "lucide-react";
import { MENTORS } from "@/lib/mock-data/mentorsInfor";
import { MentorSearchBar } from "@/components/ecosystem/MentorSearchBar";
import { useMentorStore } from "@/store/useMentorStore";
import type { AvailabilitySlot } from "@/lib/mock-data/mentor-dashboard";

interface MentorPackage {
  name: string;
  price: string;
  duration: string;
  description: string;
}

interface MentorProfileData {
  name: string;
  role: string;
  expertise: string[];
  rating: number;
  sessions: number;
  image: string;
  bio: string;
  languages: string[];
  education: string;
  availability: string;
  packages: MentorPackage[];
  availableSlots?: AvailabilitySlot[];
}

// ── Mock reviews per mentor ──────────────────────────────────────────────────
const MOCK_reviews = [
  {
    name: "Julia M.",
    avatar: "https://i.pravatar.cc/40?u=julia",
    rating: 5,
    date: "2 weeks ago",
    pkg: "Standard Plan",
    content: "We had a great experience working with this mentor to deepen our understanding. They are extremely knowledgeable, patient, and able to explain complex concepts in a very practical and accessible way. What stood out most was the ability to tailor the sessions to our specific use cases. We would highly recommend to any team looking to level up their skills."
  },
  {
    name: "Alex K.",
    avatar: "https://i.pravatar.cc/40?u=alex2",
    rating: 5,
    date: "1 month ago",
    pkg: "Lite Plan",
    content: "Absolutely brilliant mentor. The structured approach to problem-solving was eye-opening. I went from junior to mid-level in just 3 months of mentoring. The feedback on my portfolio was detailed and actionable."
  },
  {
    name: "Sophie T.",
    avatar: "https://i.pravatar.cc/40?u=sophie",
    rating: 5,
    date: "2 months ago",
    pkg: "Standard Plan",
    content: "Top-tier guidance on career transition. The roadmap created for me was exactly what I needed. Every session felt productive and my confidence has increased dramatically. Highly recommended!"
  }
];

// ── Helper: Star rendering ───────────────────────────────────────────────────
function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn(
            size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5",
            i <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"
          )}
        />
      ))}
    </div>
  );
}

// ── Plan Card ────────────────────────────────────────────────────────────────
interface PlanCardProps {
  pkg: { name: string; price: string; duration: string; description: string };
  isSelected?: boolean;
  onSelect: () => void;
}
function _PlanCard({ pkg, isSelected, onSelect }: PlanCardProps) {
  return (
    <Card
      className={cn(
        "border-2 cursor-pointer transition-all duration-200 rounded-2xl overflow-hidden group",
        isSelected ? "border-primary shadow-lg shadow-primary/10" : "border-slate-100 hover:border-primary/40 hover:shadow-md"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className={cn(
              "text-xs font-bold uppercase tracking-widest mb-1",
              isSelected ? "text-primary" : "text-slate-400"
            )}>
              {pkg.duration}
            </div>
            <h4 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">{pkg.name}</h4>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-slate-900">${pkg.price}</span>
            <span className="text-xs text-slate-400 block">/session</span>
          </div>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">{pkg.description}</p>
        <ul className="space-y-2">
          <li className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary/700 flex-shrink-0" />
            Unlimited Q&amp;A via chat after booking
          </li>
          <li className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary/700 flex-shrink-0" />
            Response within 24 hours
          </li>
          <li className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary/700 flex-shrink-0" />
            Hands-on support &amp; resources
          </li>
        </ul>
        <Button
          className={cn(
            "w-full h-11 rounded-xl font-bold text-sm transition-all",
            isSelected
              ? "bg-primary text-white hover:bg-primary/90 shadow-glow"
              : "bg-slate-900 text-white hover:bg-primary"
          )}
        >
          Apply Now <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Review Card ──────────────────────────────────────────────────────────────
function ReviewCard({ review }: { review: typeof MOCK_reviews[0] }) {
  return (
    <Card className="glass border-slate-100 shadow-sm rounded-2xl">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white shadow">
              <AvatarImage src={review.avatar} />
              <AvatarFallback>{review.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-bold text-slate-900 text-sm">{review.name}</div>
              <div className="text-xs text-slate-400">{review.date}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StarRating rating={review.rating} />
            <span className="text-[10px] font-bold text-primary bg-primary/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {review.pkg}
            </span>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{review.content}</p>
        <div className="flex items-center gap-1 text-xs text-slate-400 pt-1">
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>Helpful</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Similar Mentor Card ──────────────────────────────────────────────────────
function SimilarMentorCard({ mentor, onView }: { mentor: MentorProfileData; onView: () => void }) {
  return (
    <Card className="glass border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden group">
      <CardContent className="p-0">
        {/* Header section - dark green like design */}
        <div className="bg-slate-800 p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-14 h-14 border-2 border-white/20">
                <AvatarImage src={mentor.image} />
                <AvatarFallback>{mentor.name[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-slate-900" />{mentor.rating}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">{mentor.name}</h4>
              <p className="text-white/60 text-xs mt-0.5">{mentor.role}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-4">
            {mentor.expertise.slice(0, 3).map((skill: string) => (
              <span key={skill} className="text-[10px] bg-white/10 text-white/80 px-2 py-0.5 rounded-md font-medium">
                {skill}
              </span>
            ))}
          </div>
        </div>
        {/* Price + CTA - light section */}
        <div className="bg-white p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Starting from</span>
            <span className="text-xl font-black text-slate-900">
              ${Math.min(...mentor.packages.map((p) => parseInt(p.price, 10)))}<span className="text-xs font-medium text-slate-400">/month</span>
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-slate-200 text-slate-700 font-bold hover:bg-primary hover:text-white hover:border-primary transition-all text-xs px-4"
            onClick={onView}
          >
            View Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function MentorProfile() {
  const { mentorSlug } = useParams<{ mentorSlug: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [selectedPkgIndex, setSelectedPkgIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [reviewsort, setreviewsort] = useState<"recommended" | "newest">("recommended");
  const [showFullBio, setShowFullBio] = useState(false);

  const { myProfile, pricingPlans } = useMentorStore();
  const myProfileSlug = myProfile.name.toLowerCase().replace(/\s+/g, "-");

  // Find mentor by slug (name slugified)
  let mentor: MentorProfileData | undefined = MENTORS.find(
    (m) => m.name.toLowerCase().replace(/\s+/g, "-") === mentorSlug
  );

  if (!mentor && mentorSlug === myProfileSlug) {
    mentor = {
      name: myProfile.name,
      role: myProfile.headline,
      expertise: myProfile.skills,
      rating: myProfile.rating || 5.0,
      sessions: myProfile.totalSessions || 0,
      image: myProfile.avatar || "https://i.pravatar.cc/150?u=myprofile",
      bio: myProfile.bio || "No bio provided.",
      languages: ["English", "Vietnamese"],
      education: "Self-taught / University",
      availability: "Flexible depending on schedule",
      packages: pricingPlans.length > 0 ? pricingPlans.map(p => ({
        name: p.title,
        price: String(p.price),
        duration: "1 hr/mo",
        description: p.description
      })) : [{ name: "Default Plan", price: "50", duration: "1 hr", description: "Default plan" }],
      availableSlots: myProfile.availableSlots || []
    };
  }

  if (!mentor) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-6 py-24 text-center space-y-6">
          <h1 className="text-3xl font-poppins font-bold text-slate-900">Mentor not found</h1>
          <p className="text-slate-500">The mentor you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/ecosystem")} className="rounded-full px-8 bg-primary text-white">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to Find a Mentor
          </Button>
        </div>
      </Layout>
    );
  }

  // Similar mentors: same expertise, exclude current
  const similarMentors = MENTORS.filter(
    (m) =>
      m.name !== mentor.name &&
      m.expertise.some((e) => mentor.expertise.includes(e))
  ).slice(0, 3);

  const selectedPkg = mentor.packages[selectedPkgIndex];

  const handleApplyNow = () => {
    navigate(
      `/payment?mentor=${encodeURIComponent(mentor.name)}&package=${encodeURIComponent(selectedPkg.name)}&price=${selectedPkg.price}`
    );
  };

  const bioPreview = mentor.bio.length > 220 ? mentor.bio.slice(0, 220) + "..." : mentor.bio;

  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const displaySlots: AvailabilitySlot[] = mentor.availableSlots && mentor.availableSlots.length > 0 
    ? mentor.availableSlots 
    : [
        { day: "Monday", from: "09:00", to: "11:00" },
        { day: "Wednesday", from: "20:00", to: "22:00" },
        { day: "Friday", from: "15:00", to: "17:00" },
        { day: "Saturday", from: "09:00", to: "12:00" }
      ];

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* ── Search Bar Area ─────────────────────────────────────────────── */}
        <div className="bg-white border-b border-slate-100 py-6 shadow-sm">
          <div className="max-w-none w-full px-4 lg:px-10 mx-auto">
            <MentorSearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              showSuggestedKeywords={true}
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
            <Link to="/" className="hover:text-primary transition-colors">
              
            </Link>
            <span>›</span>
            <Link to="/ecosystem" className="hover:text-primary transition-colors font-medium">
              Find a Mentor
            </Link>
            <span>›</span>
            <span className="text-slate-800 font-semibold">{mentor.name}</span>
          </nav>

          {/* ── Split Layout: Main (left) + Sticky Pricing (right) ─────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

            {/* ═══ LEFT COLUMN ════════════════════════════════════════════════ */}
            <div className="lg:col-span-3 space-y-8">

              {/* ── 1. HERO HEADER ─────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="bg-slate-900 border border-slate-700/50 shadow-2xl shadow-primary/5 rounded-3xl overflow-hidden relative group"
              >
                {/* Dark green header area */}
                <div className="p-8 pb-6">
                  {/* Quick responder badge */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    <span className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-bold px-4 py-1.5 rounded-full border border-white/20">
                      <Zap className="w-3.5 h-3.5 text-primary" /> Quick Responder
                    </span>
                    <span className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 text-xs font-bold px-4 py-1.5 rounded-full border border-amber-400/30">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Top Mentor
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <Avatar className="w-28 h-28 border-4 border-white/20 shadow-2xl rounded-2xl">
                        <AvatarImage src={mentor.image} className="object-cover" />
                        <AvatarFallback className="text-2xl font-bold">{mentor.name[0]}</AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Identity */}
                    <div className="flex-grow space-y-3">
                      <div>
                        <h1 className="text-3xl font-poppins font-bold text-white leading-tight">{mentor.name}</h1>
                        <p className="text-primary font-semibold text-base mt-1">
                          {mentor.role.split("@")[0].trim()} <span className="text-white/60">@</span>{" "}
                          <span className="text-primary/70">{mentor.role.split("@")[1]?.trim() || ""}</span>
                        </p>
                      </div>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-white/40" />
                          {mentor.education.includes("Germany") ? "Germany" : "Remote"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-white/40" />
                          Active yesterday
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4 text-white/40" />
                          {mentor.sessions}+ sessions
                        </span>
                      </div>

                      {/* CTA buttons */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <Button
                          onClick={() => setSaved(!saved)}
                          variant="outline"
                          className="rounded-full border-primary/30 text-white bg-primary/10 hover:bg-primary/20 hover:border-primary/50 gap-2 font-bold text-sm transition-all"
                        >
                          <Heart className={cn("w-4 h-4", saved && "fill-red-400 text-red-400")} />
                          {saved ? "Saved" : "Save"}
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-full border-primary/30 text-white bg-primary/10 hover:bg-primary/20 hover:border-primary/50 gap-2 font-bold text-sm transition-all"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Message
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-white/50 hover:text-white hover:bg-white/10 p-2 w-9 h-9"
                        >
                          <Linkedin className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 2. SOCIAL PROOF STRIP ─────────────────────────────────── */}
                <div className="bg-slate-950/40 backdrop-blur-sm px-8 py-5 flex flex-wrap border-t border-white/5 items-center gap-6">
                  <div className="flex items-center gap-2">
                    <StarRating rating={mentor.rating} size="md" />
                    <span className="text-2xl font-black text-white">{mentor.rating}</span>
                    <span className="text-white/50 text-sm">({MOCK_reviews.length} reviews)</span>
                  </div>
                  <div className="w-px h-6 bg-white/10 hidden sm:block" />
                  <div className="flex items-center gap-1.5 text-white/70 text-sm font-medium">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    8+ years experience
                  </div>
                  <div className="w-px h-6 bg-white/10 hidden sm:block" />
                  <div className="flex items-center gap-1.5 text-white/70 text-sm font-medium">
                    <Users className="w-4 h-4 text-primary" />
                    Usually responds in a few hours
                  </div>
                </div>

                {/* ── Skills Tags ─────────────────────────────────────────── */}
                <div className="px-8 py-5 border-t border-white/5">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {mentor.expertise.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs font-semibold bg-white/10 text-white/80 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/15 transition-colors"
                      >
                        {skill}
                      </span>
                    ))}
                    {mentor.expertise.length > 5 && (
                      <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20/20">
                        + {mentor.expertise.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* ── 4. ABOUT ──────────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
              >
                <Card className="glass border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                  <CardContent className="p-8 space-y-6">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <BadgeCheck className="w-5 h-5 text-primary" /> About
                    </h2>

                    <div className="text-slate-600 leading-relaxed text-sm">
                      {showFullBio ? mentor.bio : bioPreview}
                      {mentor.bio.length > 220 && (
                        <button
                          onClick={() => setShowFullBio(!showFullBio)}
                          className="text-primary font-bold ml-2 hover:underline"
                        >
                          {showFullBio ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>

                    {/* What I can help with */}
                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" /> What I can help with
                      </h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          "Interview preparation & mock interviews",
                          "Portfolio & resume review",
                          "Career roadmap & planning",
                          "Code reviews & architecture feedback",
                          "Job search strategy",
                          "Technical skill building"
                        ].map((item) => (
                          <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                            <CheckCircle2 className="w-4 h-4 text-primary/700 mt-0.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Education & Languages */}
                    <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-primary" /> Education
                        </h4>
                        <p className="text-sm text-slate-500 font-medium">{mentor.education}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Languages className="w-4 h-4 text-primary" /> Languages
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {mentor.languages.map((lang: string) => (
                            <span key={lang} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-bold">
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Weekly Availability Summary */}
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-primary" /> Weekly Availability
                      </h4>
                      <div className="p-4 bg-primary/5/50 border border-emerald-100 rounded-xl">
                        <div className="flex flex-wrap gap-2">
                          {WEEKDAYS.map(day => {
                            const daySlots = displaySlots.filter((slot) => slot.day === day);
                            return daySlots.length > 0 ? (
                              <div key={day} className="bg-white border border-primary/20 rounded-xl px-3 py-2 min-w-[100px]">
                                <p className="text-xs font-bold text-primary/90 mb-1">{day.slice(0, 3)}</p>
                                {daySlots.map((s, i) => (
                                  <p key={i} className="text-[11px] text-slate-600 font-medium">{s.from} – {s.to}</p>
                                ))}
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── 5. reviews ────────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2 }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">What mentees say</h2>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400 font-medium">Sort by:</span>
                    <button
                      onClick={() => setreviewsort("recommended")}
                      className={cn(
                        "font-bold px-3 py-1 rounded-full text-xs transition-colors",
                        reviewsort === "recommended" ? "bg-primary/10 text-primary" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Recommended
                    </button>
                    <button
                      onClick={() => setreviewsort("newest")}
                      className={cn(
                        "font-bold px-3 py-1 rounded-full text-xs transition-colors",
                        reviewsort === "newest" ? "bg-primary/10 text-primary" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Newest
                    </button>
                  </div>
                </div>
                {MOCK_reviews.map((review, i) => (
                  <ReviewCard key={i} review={review} />
                ))}
              </motion.div>

              {/* ── 6. FULL SKILLS LIST ───────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.25 }}
              >
                <Card className="glass border-slate-100 shadow-sm rounded-2xl">
                  <CardContent className="p-8 space-y-5">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" /> Full Skills List
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ...mentor.expertise,
                        "Communication", "Problem Solving", "Team Leadership",
                        "Agile / Scrum", "Code Review", "Mentoring", "Technical Writing"
                      ].map((skill) => (
                        <span
                          key={skill}
                          className="text-xs font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-full uppercase tracking-wider border border-primary/10 hover:bg-primary/10 transition-colors cursor-default"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── 7. SIMILAR MENTORS ───────────────────────────────────── */}
              {similarMentors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.3 }}
                  className="space-y-5"
                >
                  <h2 className="text-xl font-bold text-slate-900">Similar mentors</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                    {similarMentors.map((m, i) => (
                      <SimilarMentorCard
                        key={i}
                        mentor={m}
                        onView={() =>
                          navigate(`/ecosystem/mentor/${m.name.toLowerCase().replace(/\s+/g, "-")}`)
                        }
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* ═══ RIGHT COLUMN - STICKY PRICING ════════════════════════════ */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-24 space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.15 }}
                >
                  <Card className="border border-slate-200 shadow-xl rounded-3xl overflow-hidden">
                    <CardContent className="p-0">
                      {/* Plan Tabs */}
                      <div className="flex border-b border-slate-100 bg-slate-50/50">
                        {mentor.packages.map((pkg, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedPkgIndex(i)}
                            className={cn(
                              "flex-1 py-4 text-sm font-bold transition-all",
                              selectedPkgIndex === i
                                ? "text-slate-900 border-b-2 border-primary bg-white"
                                : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            {pkg.name.split(" ")[0]} Plan
                          </button>
                        ))}
                      </div>

                      {/* Selected Plan Details */}
                      <div className="p-7 space-y-5">
                        {/* Price */}
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black text-slate-900">${selectedPkg.price}</span>
                            <span className="text-slate-500 font-medium">/ month</span>
                          </div>
                          <p className="text-slate-500 text-sm mt-2 leading-relaxed">{selectedPkg.description}</p>
                        </div>

                        {/* Benefits */}
                        <ul className="space-y-3">
                          {[
                            `${selectedPkg.duration} call per month`,
                            "Unlimited Q&A via chat",
                            "Expect responses in 24 hours or less",
                            "Hands-on support"
                          ].map((item) => (
                            <li key={item} className="flex items-center gap-3 text-sm text-slate-700">
                              <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-primary/700" />
                              </div>
                              {item}
                            </li>
                          ))}
                        </ul>

                        {/* CTA */}
                        <div className="pt-2 space-y-3">
                          <Button
                            onClick={handleApplyNow}
                            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base shadow-glow transition-all"
                          >
                            Apply now
                          </Button>
                          <p className="text-center text-xs text-slate-400">
                            7-day free trial, cancel anytime.{" "}
                            <button className="text-primary font-bold underline hover:no-underline">
                              What's included?
                            </button>
                          </p>
                        </div>
                      </div>

                      {/* Scarcity / Urgency */}
                      {/* <div className="px-7 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                        <span className="text-sm font-bold text-slate-700">Only 2 spots left!</span>
                      </div> */}
                    </CardContent>
                  </Card>

                  {/* Quick Stats Card */}
                  <Card className="glass border-slate-100 shadow-sm rounded-2xl mt-4">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">Session Rating</span>
                        <div className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-black text-slate-900">{mentor.rating}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">Total Sessions</span>
                        <span className="text-sm font-black text-slate-900">{mentor.sessions}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 font-medium">Availability</span>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-full">
                          {mentor.availability}
                        </span>
                      </div>
                      <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-primary text-xs font-bold">
                        <Shield className="w-4 h-4" /> Secure Payment
                      </div>
                      <p className="text-[10px] text-slate-400 -mt-2">100% satisfaction guarantee or money back.</p>
                    </CardContent>
                  </Card>

                  {/* Custom Plan CTA */}
                  <div className="p-6 bg-primary/90 rounded-2xl text-white space-y-3 relative overflow-hidden mt-4">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <MessageSquare className="w-20 h-20" />
                    </div>
                    <h4 className="font-bold text-base relative z-10">Need a custom plan?</h4>
                    <p className="text-xs text-white/70 relative z-10">Contact the mentor directly for group sessions or specialized training.</p>
                    <Button className="w-full bg-white text-primary hover:bg-white/90 rounded-xl font-bold text-sm relative z-10">
                      <MessageSquare className="w-4 h-4 mr-2" /> Inquire Message
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
