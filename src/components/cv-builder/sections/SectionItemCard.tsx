import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface SectionItemCardProps {
  title: string;
  subtitle?: string;
  onRemove: () => void;
  canRemove: boolean;
  requireConfirmOnRemove?: boolean;
  onDuplicate?: () => void;
  canDuplicate?: boolean;
  onMoveUp?: () => void;
  canMoveUp?: boolean;
  onMoveDown?: () => void;
  canMoveDown?: boolean;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function SectionItemCard({
  title,
  subtitle,
  onRemove,
  canRemove,
  requireConfirmOnRemove = false,
  onDuplicate,
  canDuplicate = true,
  onMoveUp,
  canMoveUp = false,
  onMoveDown,
  canMoveDown = false,
  children,
  defaultExpanded = false
}: SectionItemCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { t } = useTranslation("diagnosis");

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (requireConfirmOnRemove) {
      if (window.confirm(t("builder.confirmRemove", { defaultValue: "Are you sure you want to remove this item? This action cannot be undone." }))) {
        onRemove();
      }
    } else {
      onRemove();
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all hover:shadow-md group">
      <div 
        className={cn("flex items-center justify-between p-4 cursor-pointer select-none transition-colors", expanded ? "bg-slate-50/50 border-b border-slate-100" : "hover:bg-slate-50/80")}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0 pr-4">
          <h4 className="font-semibold text-sm text-slate-800 truncate">
            {title || t("builder.actions.unnamedItem", { defaultValue: "Untitled item" })}
          </h4>
          {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <div className={cn("flex items-center gap-0.5", !expanded && "opacity-0 group-hover:opacity-100 transition-opacity")}>
            {onMoveUp && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                disabled={!canMoveUp}
                aria-label={t("builder.actions.moveUp", { defaultValue: "Move up" })}
                title={t("builder.actions.moveUp", { defaultValue: "Move up" })}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            )}
            {onMoveDown && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                disabled={!canMoveDown}
                aria-label={t("builder.actions.moveDown", { defaultValue: "Move down" })}
                title={t("builder.actions.moveDown", { defaultValue: "Move down" })}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            )}
          </div>
          {onDuplicate && (
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7 text-slate-400 hover:text-primary transition-opacity", !expanded && "opacity-0 group-hover:opacity-100")}
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              disabled={!canDuplicate}
              aria-label={t("builder.actions.duplicate", { defaultValue: "Duplicate" })}
              title={t("builder.actions.duplicate", { defaultValue: "Duplicate" })}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7 text-slate-400 hover:text-red-500 transition-opacity", !expanded && "opacity-0 group-hover:opacity-100")}
            onClick={handleRemove}
            disabled={!canRemove}
            aria-label={t("builder.actions.remove", { defaultValue: "Remove item" })}
            title={t("builder.actions.remove", { defaultValue: "Remove item" })}
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
