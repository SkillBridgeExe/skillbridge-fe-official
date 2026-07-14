import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRightLeft, ChevronDown, ChevronUp, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import type { CustomSection } from "@/lib/resume-engine/document-v1";
import { cn } from "@/lib/utils";

let itemCounter = 0;
const newItemId = () => `custom_item_${Date.now()}_${++itemCounter}`;

/**
 * Custom sections are validated content only (title + text items). They render
 * through the shared PDF section primitive; there is no way to attach code,
 * CSS or markup from here.
 */
export function CustomSectionEditor({
  supportsCustomSections,
  supportsSidebar,
}: {
  supportsCustomSections: boolean;
  supportsSidebar: boolean;
}) {
  const { t } = useTranslation("diagnosis");
  const store = useCvBuilderStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = store.customSections.find((section) => section.id === editingId) ?? null;

  if (!supportsCustomSections) {
    return (
      <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 p-2 text-[11px] text-slate-500">
        {t("builder.inspector.customSectionsUnsupported")}
      </div>
    );
  }

  const update = (id: string, patch: Partial<Omit<CustomSection, "id">>) => store.updateCustomSection(id, patch);

  return (
    <div className="space-y-1.5 pt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {t("builder.inspector.customSections")}
      </p>

      {store.customSections.length === 0 && (
        <p className="text-[10px] text-slate-400">{t("builder.inspector.customSectionsEmpty")}</p>
      )}

      <div className="space-y-1.5">
        {store.customSections.map((section, index, arr) => {
          const placementLabel =
            section.placement === "main"
              ? t("builder.inspector.moveToSidebar")
              : t("builder.inspector.moveToMain");
          return (
            <div
              key={section.id}
              className={cn(
                "flex items-center justify-between rounded-md border p-2 text-sm bg-white",
                section.visible
                  ? "border-slate-200 shadow-sm"
                  : "border-dashed border-slate-100 bg-slate-50 text-slate-400",
              )}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-slate-400 hover:text-slate-600"
                  onClick={() => update(section.id, { visible: !section.visible })}
                  aria-label={
                    section.visible
                      ? t("builder.inspector.hideSection", { section: section.title })
                      : t("builder.inspector.showSection", { section: section.title })
                  }
                >
                  {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
                <span className="truncate font-medium">{section.title}</span>
              </div>
              <div className="flex items-center gap-0.5">
                {supportsSidebar && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-sky-600"
                    onClick={() =>
                      update(section.id, { placement: section.placement === "main" ? "sidebar" : "main" })
                    }
                    aria-label={placementLabel}
                    title={placementLabel}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-slate-600"
                  onClick={() => store.moveCustomSection(section.id, "up")}
                  disabled={index === 0}
                  aria-label={t("builder.inspector.moveUp", { section: section.title })}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-slate-600"
                  onClick={() => store.moveCustomSection(section.id, "down")}
                  disabled={index === arr.length - 1}
                  aria-label={t("builder.inspector.moveDown", { section: section.title })}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-slate-600"
                  onClick={() => setEditingId(section.id)}
                  aria-label={t("builder.inspector.editCustomSection", { section: section.title })}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-red-500"
                  onClick={() => store.removeCustomSection(section.id)}
                  aria-label={t("builder.inspector.deleteCustomSection", { section: section.title })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full h-7 text-[11px] border-dashed border-slate-200 text-slate-500 hover:text-slate-700"
        onClick={() => {
          store.addCustomSection(t("builder.inspector.customSectionDefaultTitle"));
        }}
      >
        <Plus className="w-3 h-3 mr-1" />
        {t("builder.inspector.addCustomSection")}
      </Button>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{t("builder.inspector.editCustomSectionTitle")}</DialogTitle>
            <DialogDescription className="text-xs">
              {t("builder.inspector.editCustomSectionDesc")}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <label htmlFor="custom-section-title" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {t("builder.inspector.customSectionTitleLabel")}
                </label>
                <Input
                  id="custom-section-title"
                  value={editing.title}
                  maxLength={120}
                  onChange={(e) => update(editing.id, { title: e.target.value })}
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                {editing.items.map((item, index) => (
                  <div key={item.id} className="rounded-md border border-slate-200 p-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={item.heading ?? ""}
                        placeholder={t("builder.inspector.customItemHeading")}
                        aria-label={`${t("builder.inspector.customItemHeading")} ${index + 1}`}
                        onChange={(e) =>
                          update(editing.id, {
                            items: editing.items.map((it) =>
                              it.id === item.id ? { ...it, heading: e.target.value || undefined } : it,
                            ),
                          })
                        }
                        className="h-7 text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-slate-400 hover:text-red-500"
                        onClick={() =>
                          update(editing.id, { items: editing.items.filter((it) => it.id !== item.id) })
                        }
                        aria-label={t("builder.inspector.removeCustomItem", { index: index + 1 })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      value={item.body}
                      placeholder={t("builder.inspector.customItemBody")}
                      aria-label={`${t("builder.inspector.customItemBody")} ${index + 1}`}
                      onChange={(e) =>
                        update(editing.id, {
                          items: editing.items.map((it) =>
                            it.id === item.id ? { ...it, body: e.target.value } : it,
                          ),
                        })
                      }
                      className="min-h-[56px] text-xs"
                    />
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-[11px] border-dashed"
                onClick={() =>
                  update(editing.id, { items: [...editing.items, { id: newItemId(), body: "" }] })
                }
              >
                <Plus className="w-3 h-3 mr-1" />
                {t("builder.inspector.addCustomItem")}
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button size="sm" onClick={() => setEditingId(null)}>
              {t("builder.inspector.doneEditing")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
