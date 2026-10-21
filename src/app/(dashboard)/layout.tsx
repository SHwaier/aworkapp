"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // The proxy enforces this from the token; this also catches an admin reset
  // that happened after the current token was issued.
  const mustChangePassword = !!user?.mustChangePassword;
  useEffect(() => {
    if (mustChangePassword) router.replace("/change-password");
  }, [mustChangePassword, router]);

  if (isLoading || mustChangePassword) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
