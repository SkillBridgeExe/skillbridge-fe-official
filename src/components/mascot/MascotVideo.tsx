import dolphinMp4 from "@/assets/mascot/dolphin.mp4";
import laptop1Mp4 from "@/assets/mascot/laptop1.mp4";

interface MascotVideoProps {
  size?: number;
  className?: string;
  type?: "dolphin" | "laptop1";
}

export function MascotVideo({ size = 160, className, type = "dolphin" }: MascotVideoProps) {
  const videoSrc = type === "laptop1" ? laptop1Mp4 : dolphinMp4;

  return (
    <video
      src={videoSrc}
      autoPlay
      loop
      muted
      playsInline
      draggable={false}
      style={{ width: size, height: "auto" }}
      className={`select-none rounded-3xl overflow-hidden drop-shadow-[0_10px_20px_rgba(56,130,246,0.15)] ${className}`}
    />
  );
}

export default MascotVideo;
