import { motion } from "framer-motion";

interface AnimatedLogoProps {
  className?: string;
}

export default function AnimatedLogo({ className = "w-10 h-10" }: AnimatedLogoProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <motion.svg
        viewBox="0 0 40 40"
        className="w-full h-full"
        initial="hidden"
        animate="visible"
        fill="none"
      >
        <defs>
          <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="logo-s" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e0e7ff" />
          </linearGradient>
        </defs>

        {/* Rounded square background */}
        <motion.rect
          width="40" height="40" rx="10"
          fill="url(#logo-bg)"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Stylized "S" path — clean, bold, modern */}
        <motion.path
          d="M14 13.5 C14 11, 16.5 9, 20 9 C23.5 9, 26 11, 26 13.5 C26 16, 24 17, 20 18.5 C16 20, 14 21.5, 14 24.5 C14 27, 16.5 29.5, 20 29.5 C23.5 29.5, 26 27.5, 26 25"
          stroke="url(#logo-s)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: "easeInOut" }}
        />

        {/* Top accent dot */}
        <motion.circle
          cx="26.5" cy="12" r="2"
          fill="white"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.9 }}
          transition={{ delay: 1.2, duration: 0.3, type: "spring", stiffness: 300 }}
        />

        {/* Subtle shimmer */}
        <motion.rect
          x="0" y="0" width="40" height="40" rx="10"
          fill="white"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.15, 0] }}
          transition={{ delay: 1.4, duration: 0.6, ease: "easeInOut" }}
        />
      </motion.svg>
    </div>
  );
}
