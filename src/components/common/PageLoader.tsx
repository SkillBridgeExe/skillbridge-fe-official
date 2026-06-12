import { MascotLoader } from "@/components/mascot/MascotLoader";

export default function PageLoader() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <MascotLoader message="Đang tải..." size={300} />
    </div>
  );
}
