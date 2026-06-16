import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";

type AdminProgressRingProps = {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  colorClass?: string; // tailwind text-* class
  labelClassName?: string;
  labelSuffix?: string;
};

export default function AdminProgressRing({
  value,
  size = 64,
  strokeWidth = 8,
  colorClass = "text-primary",
  labelClassName = "text-[12px] font-bold text-foreground",
  labelSuffix = "%",
}: AdminProgressRingProps) {
  const circleRef = useRef<SVGCircleElement | null>(null);
  const [mounted, setMounted] = useState(false);

  const radius = useMemo(() => 24, []);
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const circle = circleRef.current;
    if (!circle) return;

    const safe = Math.max(0, Math.min(100, value));
    const targetOffset = circumference * (1 - safe / 100);
    gsap.to(circle, {
      strokeDashoffset: targetOffset,
      duration: 1.05,
      ease: "power3.out",
    });
  }, [value, circumference, mounted]);

  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 64" className="block">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeWidth={strokeWidth}
          className="text-muted-foreground"
        />
        <circle
          ref={circleRef}
          cx="32"
          cy="32"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={colorClass}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          style={{ transformOrigin: "50% 50%", transform: "rotate(-90deg)" }}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className={labelClassName}>
          {Math.round(safeValue)}
          {labelSuffix}
        </span>
      </div>
    </div>
  );
}

