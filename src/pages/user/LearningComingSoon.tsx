import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function LearningComingSoon() {
  const { t } = useTranslation("common");

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <span className="text-[11px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-6">
          {t("comingSoon.badge")}
        </span>
        <div className="w-16 h-16 rounded-2xl bg-[#F1F1EF] flex items-center justify-center mb-6">
          <Rocket className="w-8 h-8 text-[#2F3437]" />
        </div>
        <h1 className="text-3xl font-poppins font-black text-[#2F3437] mb-3">
          {t("comingSoon.learning.title")}
        </h1>
        <p className="text-[#787774] max-w-md mx-auto mb-8 leading-relaxed">
          {t("comingSoon.learning.body")}
        </p>
        <div className="flex gap-3">
          <Link to="/">
            <Button variant="outline" className="rounded-full px-6 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40">
              {t("comingSoon.backHome")}
            </Button>
          </Link>
          <Link to="/diagnosis">
            <Button className="rounded-full px-6 bg-primary hover:bg-primary/90 text-white active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40">
              {t("comingSoon.tryDiagnosis")}
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
