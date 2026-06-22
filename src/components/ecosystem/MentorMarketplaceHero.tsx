import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Star,
  UsersRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getCarouselIndex } from "@/lib/mentor-marketplace";
import type { MentorCardDto, MentorSummaryDto } from "@/services/mentor.service";

const AUTOPLAY_INTERVAL_MS = 6_500;
const SWIPE_OFFSET_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 500;

interface MentorMarketplaceHeroProps {
  summary?: MentorSummaryDto;
  featuredMentors: MentorCardDto[];
}

export function MentorMarketplaceHero({
  summary,
  featuredMentors,
}: MentorMarketplaceHeroProps) {
  const { t } = useTranslation("common");
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<-1 | 1>(1);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [pageVisible, setPageVisible] = useState(() =>
    typeof document === "undefined" ? true : !document.hidden,
  );
  const slideCount = featuredMentors.length;
  const spotlight = featuredMentors[activeIndex];
  const carouselEnabled = slideCount > 1;
  const paused = hovered || focusWithin;

  const navigate = useCallback(
    (delta: -1 | 1) => {
      setDirection(delta);
      setActiveIndex((current) => getCarouselIndex(current, delta, slideCount));
    },
    [slideCount],
  );

  useEffect(() => {
    if (activeIndex < slideCount) return;
    setActiveIndex(0);
  }, [activeIndex, slideCount]);

  useEffect(() => {
    const handleVisibilityChange = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || !pageVisible || !carouselEnabled) return;
    const timer = window.setInterval(() => navigate(1), AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [activeIndex, carouselEnabled, navigate, pageVisible, paused, reduceMotion]);

  const scrollToResults = () => {
    document
      .getElementById("mentor-results")
      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("mentor.marketplace.spotlight")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
      }}
      className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 px-6 py-8 text-white shadow-sm sm:px-10 sm:py-10 lg:min-h-[500px] lg:px-14 lg:py-12"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-sky-200/30 blur-[90px] will-change-transform"
        animate={reduceMotion ? undefined : { x: [0, -28, 0], y: [0, 20, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 12, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 left-[35%] h-72 w-72 rounded-full bg-cyan-100/25 blur-[100px] will-change-transform"
        animate={reduceMotion ? undefined : { x: [0, 24, 0], y: [0, -16, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 15, delay: 1, ease: "easeInOut", repeat: Infinity }}
      />

      <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="max-w-[680px] text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            {t("mentor.marketplace.heroTitle")}
          </h1>
          <p className="mt-6 max-w-[58ch] text-base leading-7 text-white/85 sm:text-lg">
            {t("mentor.marketplace.heroSubtitle")}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={scrollToResults}
              className="h-12 rounded-xl bg-white px-5 font-bold text-primary hover:bg-white/90 active:scale-[0.98]"
            >
              {t("mentor.marketplace.findMentor")}
              <ArrowDownRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-xl border-white/35 bg-white/10 px-5 font-bold text-white hover:bg-white/20 hover:text-white"
            >
              <Link to="/?auth=register">
                {t("mentor.marketplace.becomeMentor")}
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-9 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric
              value={summary?.verifiedExperts}
              label={t("mentor.marketplace.verifiedExperts")}
              delay={0.12}
            />
            <Metric
              value={summary?.sessionsCompleted}
              label={t("mentor.marketplace.sessionsCompleted")}
              delay={0.2}
            />
            <Metric
              value={summary?.averageRating}
              label={t("mentor.marketplace.averageRating")}
              suffix={summary?.averageRating ? "★" : undefined}
              delay={0.28}
            />
          </div>
        </motion.div>

        <div className="relative mx-auto w-full max-w-[520px] pb-14">
          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 4.5, ease: "easeInOut", repeat: Infinity }}
            className="rounded-2xl border border-white/50 bg-white/95 p-6 text-slate-900 shadow-[0_30px_80px_rgba(30,41,59,0.22)] backdrop-blur-xl dark:bg-slate-950/95 dark:text-white"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                {t("mentor.marketplace.spotlight")}
              </span>
              <BadgeCheck className="h-5 w-5 text-primary" />
            </div>

            <div className="relative mt-7 min-h-64 overflow-hidden">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                {spotlight ? (
                  <motion.div
                    key={spotlight.id}
                    custom={direction}
                    initial={reduceMotion ? false : { opacity: 0, x: direction * 32 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduceMotion ? { opacity: 1 } : { opacity: 0, x: direction * -32 }}
                    transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                    drag={reduceMotion || !carouselEnabled ? false : "x"}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.08}
                    className="flex min-h-64 flex-col"
                    onDragEnd={(_, info) => {
                      if (
                        info.offset.x <= -SWIPE_OFFSET_THRESHOLD ||
                        info.velocity.x <= -SWIPE_VELOCITY_THRESHOLD
                      ) {
                        navigate(1);
                      } else if (
                        info.offset.x >= SWIPE_OFFSET_THRESHOLD ||
                        info.velocity.x >= SWIPE_VELOCITY_THRESHOLD
                      ) {
                        navigate(-1);
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20 rounded-2xl border border-primary/20 dark:border-slate-700">
                        <AvatarImage
                          src={spotlight.avatarUrl ?? undefined}
                          className="object-cover"
                          alt={spotlight.displayName}
                        />
                        <AvatarFallback className="rounded-2xl bg-primary text-xl font-black text-primary-foreground">
                          {spotlight.displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-2xl font-black tracking-tight">
                          {spotlight.displayName}
                        </p>
                        <p className="mt-1 line-clamp-1 text-sm text-slate-600 dark:text-slate-300">
                          {spotlight.headline}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-sm font-bold">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          {spotlight.ratingAverage?.toFixed(1) ?? "-"}
                          <span className="font-medium text-slate-500 dark:text-slate-400">
                            {t("mentor.card.sessions", { count: spotlight.completedSessions })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-6 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {spotlight.shortBio}
                    </p>
                    <Button
                      asChild
                      className="mt-auto h-11 w-fit rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90"
                    >
                      <Link to={`/ecosystem/mentor/${spotlight.slug}`}>
                        {t("mentor.card.viewProfile")}
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-spotlight"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex min-h-56 items-center justify-center rounded-2xl bg-primary/10 dark:bg-slate-900"
                  >
                    <UsersRound className="h-14 w-14 text-primary" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {carouselEnabled ? (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between">
              <div className="flex items-center gap-2" role="group" aria-label={t("mentor.marketplace.spotlight")}>
                {featuredMentors.map((mentor, index) => (
                  <button
                    key={mentor.id}
                    type="button"
                    onClick={() => {
                      setDirection(index >= activeIndex ? 1 : -1);
                      setActiveIndex(index);
                    }}
                    aria-label={`${t("mentor.marketplace.spotlight")} ${index + 1}`}
                    aria-current={index === activeIndex ? "true" : undefined}
                    className={`h-2 rounded-full bg-white transition-[width,opacity] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-cyan-500 ${
                      index === activeIndex ? "w-8 opacity-100" : "w-2 opacity-50 hover:opacity-80"
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <CarouselButton
                  label={t("mentor.marketplace.previous")}
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </CarouselButton>
                <CarouselButton label={t("mentor.marketplace.next")} onClick={() => navigate(1)}>
                  <ArrowRight className="h-4 w-4" />
                </CarouselButton>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Metric({
  value,
  label,
  suffix,
  delay,
}: {
  value?: number | null;
  label: string;
  suffix?: string;
  delay: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-white/25 bg-white/10 px-4 py-4 backdrop-blur-sm"
    >
      <p className="text-2xl font-black tracking-tight">
        {value === undefined || value === null ? "-" : value.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-1 text-xs font-medium text-white/75">{label}</p>
    </motion.div>
  );
}

function CarouselButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/35 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-cyan-500 active:scale-[0.97]"
    >
      {children}
    </button>
  );
}
