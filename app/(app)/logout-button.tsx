"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={logout}
      className="w-full justify-start text-zinc-700"
    >
      <LogOut className="h-4 w-4" />
      Log out
    </Button>
  );
}
