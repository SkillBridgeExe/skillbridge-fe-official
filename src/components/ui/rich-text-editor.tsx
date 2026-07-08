import * as React from "react";
import { Bold, Italic, Link as LinkIcon, List, RemoveFormatting } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const stripKnownHtml = (text: string): string =>
  text
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

export const normalizeToBulletText = (text: string): string => {
  const cleaned = stripKnownHtml(text);
  const rawLines = cleaned
    .split(/\r?\n|[•]+/g)
    .map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean);

  const lines =
    rawLines.length > 1
      ? rawLines
      : cleaned
        .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ỵ0-9])/g)
        .map((line) => line.replace(/^\s*[-*•]\s+/, "").trim())
        .filter(Boolean);

  return lines.map((line) => `- ${line}`).join("\n");
};

const stripFormatting = (text: string): string =>
  stripKnownHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1");

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "min-h-[120px]",
}: RichTextEditorProps) {
  const { t } = useTranslation("diagnosis");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = React.useState(false);

  const replaceSelection = React.useCallback(
    (format: (selection: string) => string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.slice(start, end);
      const replacement = format(selected);
      const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
      onChange(nextValue);

      window.requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + replacement.length);
      });
    },
    [onChange, value],
  );

  const addLink = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedUrl = linkUrl.trim();
    if (!/^https?:\/\/\S+\.\S+/.test(trimmedUrl)) return;

    replaceSelection((selected) => {
      const label = selected.trim() || trimmedUrl;
      return `[${label}](${trimmedUrl})`;
    });
    setLinkPopoverOpen(false);
    setLinkUrl("");
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className,
      )}
    >
      <div className="flex items-center gap-1 border-b border-input bg-slate-50/80 p-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => replaceSelection((selected) => `**${selected || t("builder.richText.sampleText")}**`)}
          title={t("builder.richText.bold")}
          aria-label={t("builder.richText.bold")}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => replaceSelection((selected) => `_${selected || t("builder.richText.sampleText")}_`)}
          title={t("builder.richText.italic")}
          aria-label={t("builder.richText.italic")}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(normalizeToBulletText(value))}
          title={t("builder.richText.convertToBullets")}
          aria-label={t("builder.richText.convertToBullets")}
        >
          <List className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={t("builder.richText.addLink")}
              aria-label={t("builder.richText.addLink")}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <form onSubmit={addLink} className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-700">{t("builder.richText.linkUrl")}</label>
              <Input
                autoFocus
                placeholder="https://"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                className="h-8 text-xs"
              />
              <Button type="submit" size="sm" className="h-8 w-full text-xs">
                {t("builder.richText.apply")}
              </Button>
            </form>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8"
          onClick={() => onChange(stripFormatting(value))}
          title={t("builder.richText.clearFormatting")}
          aria-label={t("builder.richText.clearFormatting")}
        >
          <RemoveFormatting className="h-4 w-4 text-slate-500" />
        </Button>
      </div>

      <Textarea
        ref={textareaRef}
        value={stripKnownHtml(value)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          "rounded-none border-0 p-3 text-sm text-slate-700 shadow-none outline-none ring-0 focus-visible:ring-0",
          minHeight,
        )}
      />
      <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-1.5 text-[10px] text-slate-500">
        {t("builder.richText.helper")}
      </div>
    </div>
  );
}
