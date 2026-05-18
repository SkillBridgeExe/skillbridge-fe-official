import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface LockedContentProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  steps: string[];
  ctaLabel: string;
  ctaLink: string;
}

export function LockedContent({ icon, title, description, steps, ctaLabel, ctaLink }: LockedContentProps) {
  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      <Card className="border-2 border-dashed border-slate-200">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
            {icon}
          </div>
          <h2 className="text-2xl font-poppins font-bold text-slate-900 mb-3">{title}</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">{description}</p>

          <div className="text-left bg-slate-50 rounded-xl p-6 mb-8">
            <p className="text-sm font-bold text-slate-700 mb-3">Required steps:</p>
            <ol className="space-y-2">
              {steps.map((step, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                    {idx + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <Link to={ctaLink}>
            <Button size="lg" className="rounded-full">
              {ctaLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
