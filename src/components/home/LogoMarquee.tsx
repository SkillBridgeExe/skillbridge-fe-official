export default function LogoMarquee() {
  const employers = [
    { name: "FPT Software", icon: "⚡" },
    { name: "VNG Corporation", icon: "🎮" },
    { name: "Viettel Group", icon: "🌐" },
    { name: "VNPT Telecom", icon: "📞" },
    { name: "Techcombank", icon: "🏦" },
    { name: "VinGroup", icon: "🏢" },
    { name: "One Mount", icon: "💎" },
    { name: "Shopee VN", icon: "🧡" },
    { name: "Grab Vietnam", icon: "💚" }
  ];

  // Repeat twice for seamless infinite marquee loop
  const marqueeItems = [...employers, ...employers];

  return (
    <div className="w-full py-8 overflow-hidden bg-slate-50/20 border-y border-slate-200/40 relative">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-6 text-center mb-6">
        <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
          Preparing candidates for top-tier tech employers in Vietnam
        </h3>
      </div>

      <div className="relative flex items-center overflow-hidden">
        {/* Left & Right gradient overlays to fade out edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-slate-50/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-slate-50/80 to-transparent z-10 pointer-events-none" />

        {/* w-max giữ hàng logo đúng bề rộng nội dung; translateX(-50%) loop mượt vì list nhân đôi */}
        <div className="flex w-max shrink-0 items-center gap-12 md:gap-16 [animation:marquee_25s_linear_infinite] hover:[animation-play-state:paused]">
          {marqueeItems.map((item, idx) => (
            <div 
              key={idx} 
              className="flex items-center gap-2 text-slate-400/80 hover:text-slate-600 transition-colors duration-300 select-none cursor-default"
            >
              <span className="text-sm md:text-base opacity-70 filter grayscale">{item.icon}</span>
              <span className="font-display font-bold text-sm md:text-base tracking-tight uppercase">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
