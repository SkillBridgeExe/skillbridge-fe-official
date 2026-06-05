import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useInView } from "framer-motion";

interface CountUpProps {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}

export default function CountUp({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 2,
}: CountUpProps) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(nodeRef, { once: true, margin: "-50px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 25,
    stiffness: 80,
    mass: 1,
    duration: duration * 1000,
  });

  useEffect(() => {
    if (isInView) {
      motionValue.set(to);
    }
  }, [isInView, motionValue, to]);

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (nodeRef.current) {
        nodeRef.current.textContent = `${prefix}${Number(latest).toFixed(decimals)}${suffix}`;
      }
    });
  }, [springValue, prefix, suffix, decimals]);

  return (
    <span ref={nodeRef} className="font-mono">
      {prefix}0{suffix}
    </span>
  );
}
