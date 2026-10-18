import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "error" | "success" | "info";

const variants: Record<Variant, string> = {
  error: "bg-rose-50 border-rose-200 text-rose-800",
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  info: "bg-indigo-50 border-indigo-200 text-indigo-800",
};

export function Alert({
  variant = "info",
  className,
  children,
}: {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        variants[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
