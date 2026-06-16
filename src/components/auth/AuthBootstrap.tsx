import { useEffect } from "react";
import { bootstrapAuthSession } from "@/services/auth-session.service";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthBootstrap() {
  useEffect(() => {
    const bootstrap = () => {
      void bootstrapAuthSession();
    };

    if (useAuthStore.persist.hasHydrated()) {
      bootstrap();
      return;
    }

    return useAuthStore.persist.onFinishHydration(bootstrap);
  }, []);

  return null;
}
