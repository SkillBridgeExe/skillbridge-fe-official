import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoginDialog } from "@/components/auth/LoginDialog";

export default function Login() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) navigate("/");
  };

  return (
    <LoginDialog
      open={open}
      mode={mode}
      onModeChange={setMode}
      onOpenChange={handleOpenChange}
    />
  );
}
