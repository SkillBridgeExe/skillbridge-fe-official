import { MascotLoader } from "@/components/mascot/MascotLoader";

export default function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <MascotLoader message="Đang tải..." size={300} />
    </div>
  );
}
