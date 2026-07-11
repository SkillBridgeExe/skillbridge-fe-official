import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { t } = useTranslation("diagnosis");

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (requireConfirmOnRemove) {
      setShowRemoveDialog(true);
    } else {
      onRemove();
    }
  };

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all hover:shadow-md group">
      <div 
        className={cn("flex items-center justify-between p-4 cursor-pointer select-none transition-colors", expanded ? "bg-slate-50/50 border-b border-slate-100" : "hover:bg-slate-50/80")}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0 pr-4">
          <h4 className="font-semibold text-sm text-slate-800 truncate">
            {title || t("builder.actions.unnamedItem")}
          </h4>
          {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5">
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
                aria-label={t("builder.actions.moveUp")}
                title={t("builder.actions.moveUp")}
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
                aria-label={t("builder.actions.moveDown")}
                title={t("builder.actions.moveDown")}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            )}
          </div>
          {onDuplicate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-primary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              disabled={!canDuplicate}
              aria-label={t("builder.actions.duplicate")}
              title={t("builder.actions.duplicate")}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-red-500 transition-colors"
            onClick={handleRemoveClick}
            disabled={!canRemove}
            aria-label={t("builder.actions.remove")}
            title={t("builder.actions.remove")}
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
            initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeInOut" }}
          >
            <div className="p-4 pt-5 bg-white">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
      
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("builder.confirmRemoveTitle") || "Remove item?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("builder.confirmRemove")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("builder.import.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onRemove} className="bg-red-600 hover:bg-red-700">
              {t("builder.actions.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
