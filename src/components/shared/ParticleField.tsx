// Decorative floating particles — pure CSS animations (compositor thread,
// zero JS per frame). Positions are computed ONCE at module load so they
// stay stable across re-renders of the parent page.
const PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 1,
  duration: Math.random() * 12 + 8,
  delay: Math.random() * 4,
}));

export default function ParticleField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <style>{`
        @keyframes particle-drift {
          0%, 100% { transform: translateY(0); opacity: 0; }
          50% { transform: translateY(-60px); opacity: 0.7; }
        }
        @media (prefers-reduced-motion: reduce) {
          .particle-dot { animation: none !important; opacity: 0.25; }
        }
      `}</style>
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="particle-dot absolute rounded-full bg-blue-500/15 will-change-transform"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            animation: `particle-drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
