import { useEffect } from "react";
import { usePostHog } from "@posthog/react";
import { bootstrapAuthSession } from "@/services/auth-session.service";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthBootstrap() {
  const posthog = usePostHog();

  useEffect(() => {
    const bootstrap = () => {
      void bootstrapAuthSession()
        .then(() => {
          const { authSource, currentUser } = useAuthStore.getState();
          if (authSource === "api" && currentUser) {
            posthog?.identify(currentUser.id, { role: currentUser.role });
          }
        })
        .catch((error) => {
          console.warn("Failed to bootstrap auth session", error);
        });
    };

    if (useAuthStore.persist.hasHydrated()) {
      bootstrap();
      return;
    }

    return useAuthStore.persist.onFinishHydration(bootstrap);
  }, [posthog]);

  return null;
}
