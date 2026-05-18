declare module "canvas-confetti" {
  interface Options {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number; y?: number };
    zIndex?: number;
    angle?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    ticks?: number;
    colors?: string[];
  }
  function confetti(options?: Options): Promise<null>;
  export default confetti;
}
