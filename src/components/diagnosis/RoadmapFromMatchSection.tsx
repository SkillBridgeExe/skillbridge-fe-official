import { useEffect, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LearningRoadmapWizard } from "@/components/learning/LearningRoadmapWizard";
import { useRoadmapStore } from "@/components/learning/roadmap-store";
import { OPEN_ROADMAP_WIZARD_EVENT } from "@/components/companion/skills/chat-action-events";

/** Entry point from a completed CV × JD diagnosis into the server-owned Learning V2 wizard. */
export function RoadmapFromMatchSection({
  matchId,
  onScanAgain,
}: {
  matchId?: string | null;
  onScanAgain: () => void;
}) {
  const { t } = useTranslation("diagnosis");
  const navigate = useNavigate();
  const setActiveRoadmap = useRoadmapStore((state) => state.setActiveRoadmap);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    const openWizard = () => setIsWizardOpen(true);
    window.addEventListener(OPEN_ROADMAP_WIZARD_EVENT, openWizard);
    return () =>
      window.removeEventListener(OPEN_ROADMAP_WIZARD_EVENT, openWizard);
  }, [matchId]);

  return (
    <>
      <div className="m-4 flex flex-col items-center justify-between gap-6 rounded-xl border border-[#EAEAEA] bg-[#FBFBFA] p-6 sm:flex-row">
        <div>
          <p className="text-base font-bold text-[#2F3437]">
            {t("results.roadmapTitle")}
          </p>
          <p className="mt-1 text-sm text-[#787774]">
            {t("results.roadmapDesc")}
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <Button
            variant="ghost"
            onClick={onScanAgain}
            className="h-12 gap-2 rounded-lg text-sm font-semibold text-[#787774] hover:bg-[#F1F1EF]"
          >
            <RotateCcw className="h-4 w-4" /> {t("results.scanAgain")}
          </Button>
          {matchId ? (
            <Button
              onClick={() => setIsWizardOpen(true)}
              className="h-12 shrink-0 gap-2 rounded-lg bg-primary px-6 text-sm font-bold text-white shadow-sm hover:bg-primary/90"
            >
              {t("results.generatePlan")} <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="h-12 shrink-0 rounded-lg bg-primary text-sm font-bold text-white"
              asChild
            >
              <Link
                to="/diagnosis"
                className="flex h-full items-center gap-2 px-6"
              >
                {t("results.generatePlan")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {matchId && isWizardOpen ? (
        <LearningRoadmapWizard
          initialMatchId={matchId}
          onClose={() => setIsWizardOpen(false)}
          onGenerated={(roadmap) => {
            setActiveRoadmap(roadmap);
            setIsWizardOpen(false);
            navigate("/learning");
          }}
        />
      ) : null}
    </>
  );
}
