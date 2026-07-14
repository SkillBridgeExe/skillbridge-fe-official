import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  HelpCircle,
  Mail,
  MessageCircle,
  Quote,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

type PublicInfoVariant = "about" | "success" | "testimonials" | "privacy" | "help" | "contact";

type PageAction =
  | {
      label: string;
      to: string;
      href?: never;
      icon?: LucideIcon;
    }
  | {
      label: string;
      href: string;
      to?: never;
      icon?: LucideIcon;
    };

interface InfoCard {
  title: string;
  body: string;
  icon: LucideIcon;
}

interface InfoDetail {
  label: string;
  body: string;
}

interface InfoSignal {
  label: string;
  value: string;
  detail: string;
}

interface PageContent {
  eyebrow: string;
  heroIcon: LucideIcon;
  primaryAction: PageAction;
  secondaryAction: PageAction;
  signals: InfoSignal[];
  cards: InfoCard[];
  detailTitle: string;
  detailIntro: string;
  details: InfoDetail[];
}

interface PlaceholderProps {
  title: string;
  description: string;
  variant?: PublicInfoVariant;
}

const PAGE_CONTENT: Record<PublicInfoVariant, PageContent> = {
  about: {
    eyebrow: "SkillBridge mission",
    heroIcon: Sparkles,
    primaryAction: { label: "Start diagnosis", to: "/diagnosis", icon: SearchCheck },
    secondaryAction: { label: "Explore learning", to: "/learning", icon: ArrowRight },
    signals: [
      { label: "Public flow", value: "AI + mentor", detail: "Skill diagnosis, roadmap guidance, and career context in one path." },
      { label: "Mobile read", value: "360px+", detail: "Built so first-time visitors can scan the story on small screens." },
      { label: "Product focus", value: "Career clarity", detail: "Less guessing, more evidence-backed next steps." },
    ],
    cards: [
      {
        title: "Diagnose first",
        body: "Start from current skills, projects, and target roles instead of another generic course list.",
        icon: SearchCheck,
      },
      {
        title: "Build the path",
        body: "Turn the diagnosis into a focused roadmap with milestones people can actually finish.",
        icon: Target,
      },
      {
        title: "Connect to work",
        body: "Use verified skills and a stronger profile to prepare for mentors, interviews, and jobs.",
        icon: Users,
      },
    ],
    detailTitle: "What SkillBridge is built around",
    detailIntro: "The public product story stays simple: understand the gap, practice the right skills, and show evidence clearly.",
    details: [
      { label: "For learners", body: "A clearer way to decide what to learn next and why it matters for a target role." },
      { label: "For mentors", body: "More context before giving feedback, so advice can be specific and practical." },
      { label: "For employers", body: "Signals that connect candidate effort with role requirements." },
    ],
  },
  success: {
    eyebrow: "Outcome signals",
    heroIcon: BarChart3,
    primaryAction: { label: "See the product", to: "/diagnosis", icon: SearchCheck },
    secondaryAction: { label: "Read learner stories", to: "/testimonials", icon: Quote },
    signals: [
      { label: "Reporting style", value: "Verified only", detail: "No inflated placement numbers or unsupported claims." },
      { label: "Success lens", value: "Progress", detail: "Roadmap completion, portfolio quality, and interview readiness." },
      { label: "Publish rule", value: "Evidence first", detail: "Metrics should be backed by real learner data before promotion." },
    ],
    cards: [
      {
        title: "Readable progress",
        body: "Show improvement through completed steps, stronger CV sections, and clearer career targets.",
        icon: CheckCircle2,
      },
      {
        title: "Role readiness",
        body: "Connect skill evidence with the role requirements learners are actually aiming for.",
        icon: ClipboardCheck,
      },
      {
        title: "Honest metrics",
        body: "Keep public numbers conservative until the team can verify them from real product usage.",
        icon: ShieldCheck,
      },
    ],
    detailTitle: "How success will be shown",
    detailIntro: "This page now presents the measurement approach without pretending the product has more validated data than it does.",
    details: [
      { label: "Short term", body: "Track learner activation, completed recommendations, and CV improvements." },
      { label: "Mid term", body: "Compare roadmap progress with interview practice and mentor feedback quality." },
      { label: "Long term", body: "Publish career outcomes only when the source data is reliable." },
    ],
  },
  testimonials: {
    eyebrow: "Learner stories",
    heroIcon: Quote,
    primaryAction: { label: "Start your path", to: "/diagnosis", icon: SearchCheck },
    secondaryAction: { label: "View success signals", to: "/success", icon: BarChart3 },
    signals: [
      { label: "Story type", value: "Practical", detail: "Focused on clarity, confidence, and better preparation." },
      { label: "Tone", value: "Grounded", detail: "No invented names or exaggerated career claims." },
      { label: "Next step", value: "Collect", detail: "Replace sample story slots with verified learner stories over time." },
    ],
    cards: [
      {
        title: "Roadmap clarity",
        body: "I stopped jumping between random tutorials and understood which skills mattered for my role target.",
        icon: Target,
      },
      {
        title: "CV confidence",
        body: "The review made my gaps concrete, so I could improve the evidence instead of only changing the design.",
        icon: ClipboardCheck,
      },
      {
        title: "Interview focus",
        body: "Practice felt more useful because the questions connected back to my actual skill profile.",
        icon: MessageCircle,
      },
    ],
    detailTitle: "What belongs here",
    detailIntro: "The page is ready for real testimonials, while the current copy explains the types of stories SkillBridge should collect.",
    details: [
      { label: "Verified quotes", body: "Add learner-approved quotes with context once real feedback is available." },
      { label: "Before and after", body: "Show the problem, the product moment, and the practical outcome." },
      { label: "No fake proof", body: "Avoid placeholder names and made-up percentages that weaken trust." },
    ],
  },
  privacy: {
    eyebrow: "Privacy overview",
    heroIcon: ShieldCheck,
    primaryAction: { label: "Contact us", to: "/contact", icon: Mail },
    secondaryAction: { label: "Back to home", to: "/", icon: ArrowRight },
    signals: [
      { label: "Data scope", value: "Career data", detail: "CV, skills, goals, and usage context should be handled carefully." },
      { label: "Trust cue", value: "Control", detail: "Users need to understand what is collected and why." },
      { label: "Publishing rule", value: "Clear copy", detail: "Privacy text should be readable before legal detail gets expanded." },
    ],
    cards: [
      {
        title: "Collect with purpose",
        body: "Ask for career data only when it supports diagnosis, roadmap, profile, or matching workflows.",
        icon: ClipboardCheck,
      },
      {
        title: "Explain usage",
        body: "Make it clear when data powers AI recommendations, saved profiles, or product analytics.",
        icon: HelpCircle,
      },
      {
        title: "Protect access",
        body: "Keep account and career information tied to the right user session and authorization rules.",
        icon: ShieldCheck,
      },
    ],
    detailTitle: "Plain-language privacy notes",
    detailIntro: "This is a publishable summary surface for visitors. Detailed legal policy text can grow without changing the route.",
    details: [
      { label: "Personal information", body: "SkillBridge may use profile, CV, and goal data to provide the requested product experience." },
      { label: "Product analytics", body: "Usage events help improve onboarding, diagnosis quality, and learning recommendations." },
      { label: "Questions", body: "Visitors can use the contact page for privacy or account-specific questions." },
    ],
  },
  help: {
    eyebrow: "Help center",
    heroIcon: HelpCircle,
    primaryAction: { label: "Start diagnosis", to: "/diagnosis", icon: SearchCheck },
    secondaryAction: { label: "Contact support", to: "/contact", icon: Mail },
    signals: [
      { label: "Best first step", value: "Diagnosis", detail: "Upload or describe your background to get a practical path." },
      { label: "Common need", value: "Roadmap", detail: "Learners usually need fewer choices and clearer milestones." },
      { label: "Support style", value: "Actionable", detail: "Help content should answer what to do next." },
    ],
    cards: [
      {
        title: "How does diagnosis work?",
        body: "SkillBridge reads your background and target role, then turns gaps into a clearer improvement plan.",
        icon: SearchCheck,
      },
      {
        title: "Do I need a finished CV?",
        body: "No. A draft, project notes, or role target can still help the product suggest a better next step.",
        icon: ClipboardCheck,
      },
      {
        title: "Where should I begin?",
        body: "Start with diagnosis, review the roadmap, then use CV and interview tools as your skills improve.",
        icon: Target,
      },
    ],
    detailTitle: "Quick answers",
    detailIntro: "The help page now gives visitors real orientation instead of a blank future-content state.",
    details: [
      { label: "Account access", body: "Use login or registration from the navigation when you are ready to save progress." },
      { label: "Learning roadmap", body: "Roadmaps are meant to prioritize practice, not overwhelm you with every possible topic." },
      { label: "Mentor and jobs", body: "Marketplace surfaces are separate product flows and can be explored when your profile is ready." },
    ],
  },
  contact: {
    eyebrow: "Contact SkillBridge",
    heroIcon: Mail,
    primaryAction: { label: "Email support", href: "mailto:support@skillbridge.vn", icon: Mail },
    secondaryAction: { label: "Start with diagnosis", to: "/diagnosis", icon: SearchCheck },
    signals: [
      { label: "Learners", value: "Support", detail: "Questions about diagnosis, learning paths, CV review, or account access." },
      { label: "Partners", value: "Connect", detail: "Mentor, hiring, and collaboration conversations can start here." },
      { label: "Feedback", value: "Improve", detail: "Report confusing flows, broken content, or missing guidance." },
    ],
    cards: [
      {
        title: "Product questions",
        body: "Ask about diagnosis, roadmap recommendations, CV builder behavior, or interview preparation.",
        icon: HelpCircle,
      },
      {
        title: "Partnership inquiries",
        body: "Use contact for mentor, school, hiring, or business collaboration conversations.",
        icon: Users,
      },
      {
        title: "Feedback and issues",
        body: "Share what felt unclear, broken, or hard to use so the team can improve the public experience.",
        icon: MessageCircle,
      },
    ],
    detailTitle: "Before you reach out",
    detailIntro: "A little context helps the team respond with a useful answer instead of a generic reply.",
    details: [
      { label: "Tell us your role", body: "Learner, mentor, employer, school partner, or product evaluator." },
      { label: "Include the page", body: "Mention the route or feature you were using when you saw the issue." },
      { label: "Share the goal", body: "Describe what you expected to happen and what you need next." },
    ],
  },
};

function inferVariant(title: string): PublicInfoVariant {
  const normalized = title.toLowerCase();

  if (normalized.includes("success")) return "success";
  if (normalized.includes("testimonial")) return "testimonials";
  if (normalized.includes("privacy")) return "privacy";
  if (normalized.includes("help")) return "help";
  if (normalized.includes("contact")) return "contact";
  return "about";
}

function isExternalAction(action: PageAction): action is Extract<PageAction, { href: string }> {
  return typeof action.href === "string";
}

function ActionButton({ action, primary = false }: { action: PageAction; primary?: boolean }) {
  const Icon = action.icon ?? ArrowRight;
  const className = cn(
    "h-12 w-full rounded-full px-5 text-sm font-bold whitespace-normal leading-snug sm:w-auto sm:whitespace-nowrap",
    primary
      ? "bg-primary text-white shadow-[0_12px_28px_rgba(0,174,239,0.22)] hover:bg-primary/90"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  );
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0">{action.label}</span>
    </>
  );

  if (isExternalAction(action)) {
    return (
      <Button asChild variant={primary ? "default" : "outline"} className={className}>
        <a href={action.href}>{content}</a>
      </Button>
    );
  }

  return (
    <Button asChild variant={primary ? "default" : "outline"} className={className}>
      <Link to={action.to}>{content}</Link>
    </Button>
  );
}

export default function PlaceholderPage({
  title,
  description,
  variant,
}: PlaceholderProps) {
  const content = PAGE_CONTENT[variant ?? inferVariant(title)];
  const HeroIcon = content.heroIcon;

  return (
    <Layout>
      <section className="relative overflow-hidden px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl sm:h-80 sm:w-80" />
          <div className="absolute -right-24 top-48 h-72 w-72 rounded-full bg-sky-100/70 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="grid min-w-0 gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="min-w-0 text-center lg:text-left">
              <div className="mx-auto mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary lg:mx-0">
                <HeroIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{content.eyebrow}</span>
              </div>

              <h1 className="mx-auto max-w-3xl break-words font-poppins text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl lg:mx-0 lg:text-5xl">
                {title}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl break-words text-base font-medium leading-relaxed text-slate-600 sm:text-lg lg:mx-0">
                {description}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
                <ActionButton action={content.primaryAction} primary />
                <ActionButton action={content.secondaryAction} />
              </div>
            </div>

            <div className="min-w-0 rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-4 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.28)] backdrop-blur sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Snapshot</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-900">Public visitor view</p>
                </div>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <HeroIcon className="h-5 w-5" />
                </span>
              </div>

              <div className="grid gap-3">
                {content.signals.map((signal) => (
                  <div
                    key={signal.label}
                    className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                        {signal.label}
                      </p>
                      <p className="shrink-0 text-sm font-black text-primary">{signal.value}</p>
                    </div>
                    <p className="mt-2 break-words text-sm font-medium leading-relaxed text-slate-600">
                      {signal.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {content.cards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.title}
                  className="min-w-0 rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-[0_16px_44px_-32px_rgba(15,23,42,0.32)]"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="break-words text-lg font-black text-slate-950">{card.title}</h2>
                  <p className="mt-2 break-words text-sm font-medium leading-relaxed text-slate-600">
                    {card.body}
                  </p>
                </article>
              );
            })}
          </div>

          <section className="mt-5 grid min-w-0 gap-4 rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.32)] sm:p-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-6">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Useful context</p>
              <h2 className="mt-2 break-words text-2xl font-black leading-tight text-slate-950">
                {content.detailTitle}
              </h2>
              <p className="mt-3 break-words text-sm font-medium leading-relaxed text-slate-600">
                {content.detailIntro}
              </p>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {content.details.map((detail) => (
                <div key={detail.label} className="min-w-0 rounded-2xl bg-slate-50 p-4">
                  <p className="break-words text-sm font-black text-slate-900">{detail.label}</p>
                  <p className="mt-1 break-words text-sm font-medium leading-relaxed text-slate-600">
                    {detail.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </Layout>
  );
}
