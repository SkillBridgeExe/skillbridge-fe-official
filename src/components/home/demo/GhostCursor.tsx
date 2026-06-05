import { motion } from "framer-motion";
import { MousePointer2 } from "lucide-react";

/** Con trỏ "ma" dùng chung cho mọi hero demo — style chuẩn từ HeroDashboardDemo. */
export function CursorPointer() {
  return <MousePointer2 className="w-5 h-5 text-slate-900 fill-white drop-shadow-md" />;
}

/** Vòng ripple loang ra tại điểm click (toạ độ tương đối với card). */
export function ClickRipple({ x, y }: { x: number; y: number }) {
  return (
    <motion.span
      className="absolute z-30 w-8 h-8 rounded-full border-2 border-blue-500/60 pointer-events-none"
      style={{ left: x - 16, top: y - 16 }}
      initial={{ scale: 0.3, opacity: 0.8 }}
      animate={{ scale: 1.6, opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    />
  );
}
