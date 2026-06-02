import { cn } from "@/lib/utils";
import { MascotSticker } from "./MascotSticker";

/**
 * Inline centered loading dolphin — a drop-in replacement for section/page
 * spinners (PageLoader, table loaders, etc.). NOT full-screen and NOT a
 * blocking overlay; just an in-flow loading indicator.
 */
export function MascotLoader({
  message,
  size = 150,
  className,
}: {
  message?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <MascotSticker state="loading" size={size} interactive={false} />
      {message && <p className="text-sm text-slate-500">{message}</p>}
    </div>
  );
}

export default MascotLoader;
