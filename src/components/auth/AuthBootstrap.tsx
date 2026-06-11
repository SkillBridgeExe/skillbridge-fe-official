import { useEffect } from "react";
import { bootstrapAuthSession } from "@/services/auth-session.service";

export default function AuthBootstrap() {
  useEffect(() => {
    void bootstrapAuthSession();
  }, []);

  return null;
}
