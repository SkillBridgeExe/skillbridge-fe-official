import type { ReactNode } from "react";
import AuthGuard from "@/components/layout/AuthGuard";

interface LearningAccessBoundaryProps {
  children: ReactNode;
}

export default function LearningAccessBoundary({ children }: LearningAccessBoundaryProps) {
  return <AuthGuard requiredRole="user">{children}</AuthGuard>;
}
