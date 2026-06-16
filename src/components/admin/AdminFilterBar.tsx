import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type AdminFilterOption = { value: string; label: string };

type AdminFilterBarProps = {
  placeholder?: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  statusValue?: string;
  onStatusChange?: (v: string) => void;
  statusOptions?: AdminFilterOption[];
  dateValue?: string;
  onDateChange?: (v: string) => void;
  onReset?: () => void;
  rightSlot?: ReactNode;
  icon?: LucideIcon;
  searchLabel?: string;
};

export default function AdminFilterBar({
  placeholder = "Search...",
  searchValue,
  onSearchChange,
  statusValue,
  onStatusChange,
  statusOptions = [],
  dateValue,
  onDateChange,
  onReset,
  rightSlot,
  icon: Icon,
  searchLabel,
}: AdminFilterBarProps) {
  return (
    <div className={cn("flex flex-col gap-3 p-2 md:flex-row md:items-end md:justify-between")}>
      <div className="flex flex-1 flex-col sm:flex-row gap-3 md:items-end w-full">
        <div className="flex-1">
          {searchLabel ? (
            <div className="mb-1 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              {searchLabel}
            </div>
          ) : null}
          <div className="relative">
            {Icon ? (
              <Icon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            ) : null}
            <Input
              value={searchValue}
              placeholder={placeholder}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn(Icon ? "pl-10" : undefined)}
            />
          </div>
        </div>

        {statusValue !== undefined && onStatusChange ? (
          <div className="w-full sm:w-44">
            <div className="mb-1 text-xs font-semibold uppercase tracking-normal text-muted-foreground">Status</div>
            <Select value={statusValue} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {dateValue !== undefined && onDateChange ? (
          <div className="w-full sm:w-44">
            <div className="mb-1 text-xs font-semibold uppercase tracking-normal text-muted-foreground">Date</div>
            <Input 
              type="date" 
              value={dateValue} 
              onChange={(e) => onDateChange(e.target.value)} 
              className="w-full"
            />
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 mt-3 md:mt-0">
        {rightSlot}
        {onReset ? (
          <Button type="button" variant="outline" className="rounded-xl" onClick={onReset}>
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}


