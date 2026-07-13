import { useTranslation } from "react-i18next";

export default function LogoMarquee() {
  const { t } = useTranslation("home");
  const employers = [
    { name: "FPT Software", mark: "FP" },
    { name: "VNG Corporation", mark: "VN" },
    { name: "Viettel Group", mark: "VT" },
    { name: "VNPT Telecom", mark: "PT" },
    { name: "Techcombank", mark: "TC" },
    { name: "VinGroup", mark: "VG" },
    { name: "One Mount", mark: "OM" },
    { name: "Shopee VN", mark: "SP" },
    { name: "Grab Vietnam", mark: "GR" },
  ];

  const marqueeItems = [...employers, ...employers];

  return (
    <div className="relative w-full overflow-hidden border-y border-slate-200/40 bg-slate-50/20 py-8">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <div className="mx-auto mb-6 max-w-7xl px-6 text-center">
        <h3 className="text-[10px] font-bold uppercase leading-relaxed tracking-widest text-slate-400 sm:text-xs">
          {t("marquee")}
        </h3>
      </div>

      <div className="relative flex items-center overflow-hidden">
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-16 bg-gradient-to-r from-slate-50/80 to-transparent md:w-32" />
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-16 bg-gradient-to-l from-slate-50/80 to-transparent md:w-32" />

        <div className="flex w-max shrink-0 items-center gap-8 [animation:marquee_25s_linear_infinite] hover:[animation-play-state:paused] md:gap-14">
          {marqueeItems.map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              className="flex cursor-default select-none items-center gap-2.5 text-slate-400/80 transition-colors duration-300 hover:text-slate-600"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/70 bg-white text-[10px] font-black tracking-tight text-slate-400 shadow-sm">
                {item.mark}
              </span>
              <span className="font-display text-sm font-bold uppercase tracking-tight md:text-base">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
