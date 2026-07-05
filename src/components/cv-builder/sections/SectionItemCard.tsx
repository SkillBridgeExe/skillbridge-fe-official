import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SectionItemCardProps {
  title: string;
  subtitle?: string;
  onRemove: () => void;
  canRemove: boolean;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function SectionItemCard({
  title,
  subtitle,
  onRemove,
  canRemove,
  children,
  defaultExpanded = false
}: SectionItemCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all hover:shadow-md group">
      <div 
        className={cn("flex items-center justify-between p-4 cursor-pointer select-none transition-colors", expanded ? "bg-slate-50/50 border-b border-slate-100" : "hover:bg-slate-50/80")}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0 pr-4">
          <h4 className="font-semibold text-sm text-slate-800 truncate">{title || "(Chưa có tên)"}</h4>
          {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7 text-slate-400 hover:text-red-500 transition-opacity", !expanded && "opacity-0 group-hover:opacity-100")}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            disabled={!canRemove}
            aria-label="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <div className="text-slate-400 w-5 h-5 flex items-center justify-center">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="p-4 pt-5 bg-white">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
