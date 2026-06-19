import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Search, SlidersHorizontal, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { MentorCard } from "@/components/ecosystem/MentorCard";
import { MentorFilters } from "@/components/ecosystem/MentorFilters";
import { MentorListSkeleton } from "@/components/ecosystem/MentorListSkeleton";
import { MentorMarketplaceHero } from "@/components/ecosystem/MentorMarketplaceHero";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMentorFilters, useMentors, useMentorSummary } from "@/hooks/use-mentors";
import { getMentorMarketplaceQuery, selectFeaturedMentors } from "@/lib/mentor-marketplace";

const FEATURED_MENTORS_QUERY = { sort: "rating_desc" as const, page: 1, limit: 3 };

export default function Ecosystem() {
  const { t } = useTranslation("common");
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => getMentorMarketplaceQuery(searchParams), [searchParams]);
  const [searchInput, setSearchInput] = useState(query.query ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const summaryQuery = useMentorSummary();
  const filtersQuery = useMentorFilters();
  const mentorsQuery = useMentors(query);
  const featuredMentorsQuery = useMentors(FEATURED_MENTORS_QUERY);
  const featuredMentors = useMemo(
    () =>
      selectFeaturedMentors(
        summaryQuery.data?.spotlightMentor,
        featuredMentorsQuery.data?.items ?? [],
      ),
    [featuredMentorsQuery.data?.items, summaryQuery.data?.spotlightMentor],
  );

  useEffect(() => {
    setSearchInput(query.query ?? "");
  }, [query.query]);

  const updateParam = useCallback(
    (key: "query" | "domain" | "minRating" | "sort" | "page", value?: string) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== "page") next.delete("page");
        return next;
      });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (searchInput.trim() === (query.query ?? "")) return;
    const timer = window.setTimeout(() => updateParam("query", searchInput.trim() || undefined), 350);
    return () => window.clearTimeout(timer);
  }, [query.query, searchInput, updateParam]);

  const resetFilters = () => {
    setSearchInput("");
    setSearchParams(new URLSearchParams());
  };

  const totalPages = Math.max(1, Math.ceil((mentorsQuery.data?.total ?? 0) / (query.limit ?? 6)));

  return (
    <Layout>
      <main className="min-h-dvh bg-background pb-20 pt-5 sm:pt-8">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <MentorMarketplaceHero
            summary={summaryQuery.data}
            featuredMentors={featuredMentors}
          />

          <section id="mentor-results" className="scroll-mt-24 pt-14 sm:pt-20">
            <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-[-0.03em] text-slate-950 dark:text-white sm:text-4xl">
                  {t("mentor.marketplace.findMentor")}
                </h2>
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t("mentor.marketplace.results", { count: mentorsQuery.data?.total ?? 0 })}
                </p>
              </div>
              <div className="flex w-full gap-2 lg:max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder={t("mentor.marketplace.searchPlaceholder")}
                    className="h-12 rounded-xl border-slate-200 bg-white pl-11 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="h-12 rounded-xl border-slate-200 bg-white px-4 lg:hidden dark:border-slate-800 dark:bg-slate-950">
                      <SlidersHorizontal className="h-4 w-4" />
                      <span className="sr-only">{t("mentor.marketplace.filters")}</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto">
                    <SheetHeader className="mb-7 text-left">
                      <SheetTitle>{t("mentor.marketplace.filters")}</SheetTitle>
                    </SheetHeader>
                    <MentorFilters
                      query={query}
                      filters={filtersQuery.data}
                      onChange={updateParam}
                      onReset={resetFilters}
                    />
                    <Button onClick={() => setFiltersOpen(false)} className="mt-8 h-11 w-full rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90">
                      {t("mentor.marketplace.applyFilters")}
                    </Button>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)]">
              <aside className="sticky top-24 hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950 lg:block">
                <MentorFilters query={query} filters={filtersQuery.data} onChange={updateParam} onReset={resetFilters} />
              </aside>

              <div>
                {mentorsQuery.isLoading ? <MentorListSkeleton /> : null}
                {mentorsQuery.isError ? (
                  <StatePanel
                    icon={<AlertCircle className="h-9 w-9" />}
                    title={t("mentor.marketplace.loadErrorTitle")}
                    body={t("mentor.marketplace.loadErrorBody")}
                    action={<Button onClick={() => void mentorsQuery.refetch()} className="rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90">{t("mentor.marketplace.retry")}</Button>}
                  />
                ) : null}
                {!mentorsQuery.isLoading && !mentorsQuery.isError && mentorsQuery.data?.items.length === 0 ? (
                  <StatePanel
                    icon={<UsersRound className="h-9 w-9" />}
                    title={t("mentor.marketplace.noResultsTitle")}
                    body={t("mentor.marketplace.noResultsBody")}
                    action={<Button variant="outline" onClick={resetFilters} className="rounded-xl">{t("mentor.marketplace.reset")}</Button>}
                  />
                ) : null}
                {mentorsQuery.data?.items.length ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    {mentorsQuery.data.items.map((mentor) => <MentorCard key={mentor.id} mentor={mentor} />)}
                  </div>
                ) : null}

                {mentorsQuery.data && mentorsQuery.data.total > (query.limit ?? 6) ? (
                  <nav className="mt-9 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950" aria-label="Mentor pagination">
                    <Button variant="ghost" disabled={(query.page ?? 1) <= 1} onClick={() => updateParam("page", String((query.page ?? 1) - 1))} className="rounded-xl font-bold">
                      {t("mentor.marketplace.previous")}
                    </Button>
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {t("mentor.marketplace.page", { current: query.page ?? 1, total: totalPages })}
                    </span>
                    <Button variant="ghost" disabled={(query.page ?? 1) >= totalPages} onClick={() => updateParam("page", String((query.page ?? 1) + 1))} className="rounded-xl font-bold">
                      {t("mentor.marketplace.next")}
                    </Button>
                  </nav>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </main>
    </Layout>
  );
}

function StatePanel({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action: React.ReactNode }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center dark:border-slate-700 dark:bg-slate-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{body}</p>
      <div className="mt-6">{action}</div>
    </div>
  );
}
