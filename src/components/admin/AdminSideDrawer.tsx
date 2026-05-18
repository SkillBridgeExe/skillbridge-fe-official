import { ReactNode } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

type AdminSideDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  widthClassName?: string;
};

export default function AdminSideDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  widthClassName = "w-[420px] max-w-full",
}: AdminSideDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false} direction="right">
      <DrawerContent
        className={[
          "!inset-x-auto !bottom-auto !top-0 !left-auto !right-0 !mt-0",
          "rounded-t-none rounded-l-[10px] border-l border-slate-200/70 dark:border-slate-700",
          widthClassName,
        ].join(" ")}
      >
        <div className="p-5 border-b border-slate-200/70 dark:border-slate-700">
          <div className="text-lg font-black text-slate-900 dark:text-slate-100">{title}</div>
          {description ? <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</div> : null}
        </div>
        <div className="p-5">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}

