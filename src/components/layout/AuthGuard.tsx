import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore, type UserRole } from "@/store/useAuthStore";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requireAuth?: boolean;
}

export default function AuthGuard({ children, requiredRole, requireAuth = true }: AuthGuardProps) {
  const { authStatus, isAuthenticated, currentUser } = useAuthStore();
  const location = useLocation();

  if (requireAuth && authStatus === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking session...
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/?auth=login" state={{ from: location }} replace />;
  }

  if (requiredRole && currentUser?.role !== requiredRole) {
    // Redirect to their own dashboard
    const roleRedirects: Record<UserRole, string> = {
      user: "/dashboard",
      admin: "/admin",
      business: "/business",
      mentor: "/mentor",
    };
    const redirect = currentUser ? roleRedirects[currentUser.role] : "/?auth=login";
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}
