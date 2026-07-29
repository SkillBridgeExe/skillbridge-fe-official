import logoPng from "@/assets/logo/LOGO_Final.png";

export function AdminBrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-visible">
        <img
          src={logoPng}
          alt="SkillBridge"
          className="h-[72px] w-auto max-w-none object-contain drop-shadow-sm"
        />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold leading-none text-foreground">SkillBridge</div>
        <div className="mt-1 truncate text-xs font-medium text-muted-foreground">Admin Operations</div>
      </div>
    </div>
  );
}
