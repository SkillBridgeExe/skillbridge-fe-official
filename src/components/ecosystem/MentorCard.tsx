import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, BadgeCheck, BriefcaseBusiness, Clock3, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MentorCardDto } from "@/services/mentor.service";

export function MentorCard({ mentor }: { mentor: MentorCardDto }) {
  const { t } = useTranslation("common");
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="group flex min-h-[320px] flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 rounded-2xl border border-slate-200 dark:border-slate-700">
          <AvatarImage className="object-cover" src={mentor.avatarUrl ?? undefined} alt={mentor.displayName} />
          <AvatarFallback className="rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
            {initials(mentor.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold tracking-tight text-slate-950 dark:text-white">
              {mentor.displayName}
            </h2>
            {mentor.verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label={t("mentor.card.verified")} /> : null}
          </div>
          <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {mentor.headline || mentor.company || t("mentor.card.verified")}
          </p>
          {mentor.company ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              {mentor.company}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          {mentor.ratingAverage?.toFixed(1) ?? "-"}
        </span>
        <span>{t("mentor.card.sessions", { count: mentor.completedSessions })}</span>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {mentor.shortBio || mentor.headline}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {mentor.skills.slice(0, 4).map((skill) => (
          <Badge key={skill.id} variant="secondary" className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {skill.displayName}
          </Badge>
        ))}
      </div>

      <div className="mt-auto flex items-end justify-between gap-4 border-t border-slate-100 pt-5 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("mentor.card.from")}</p>
          <p className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">
            {formatVnd(mentor.sessionPriceVnd)}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Clock3 className="h-3.5 w-3.5" />
            {t("mentor.card.perSession", { minutes: mentor.sessionDurationMinutes })}
          </p>
        </div>
        <Button asChild className="h-11 rounded-xl bg-primary px-4 font-bold text-primary-foreground hover:bg-primary/90 active:scale-[0.98]">
          <Link to={`/ecosystem/mentor/${mentor.slug}`}>
            {t("mentor.card.viewProfile")}
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </motion.article>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
