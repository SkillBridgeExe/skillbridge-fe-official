import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AdminIconActionButtonProps = ComponentProps<typeof Button> & {
  label: string;
  children: ReactNode;
};

export default function AdminIconActionButton({
  label,
  children,
  className,
  ...props
}: AdminIconActionButtonProps) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          size="icon"
          className={cn("rounded-full", className)}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
