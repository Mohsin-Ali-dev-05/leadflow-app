"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 5000); // Refreshes every 5 seconds
    return () => clearInterval(interval);
  }, [router]);
  return null; // It's an invisible component
}
