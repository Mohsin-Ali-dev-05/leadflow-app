import Link from "next/link";
import { Zap } from "lucide-react";
import AnimatedBackground from "@/components/ui/animated-background";
import { motion } from "framer-motion"; // We'll animate the card itself

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col bg-zinc-50 overflow-hidden">
      <AnimatedBackground />

      <header className="relative z-10 border-b border-zinc-200/50 bg-white/50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-zinc-900"
          >
            <span className="h-8 w-8 rounded-lg bg-indigo-600 text-white grid place-items-center">
              <Zap className="h-4 w-4" />
            </span>
            LeadFlow
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 grid place-items-center px-4 py-12">
        {/* The form card with a glassmorphism effect */}
        <div className="w-full max-w-md p-1 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-2xl">
          {children}
        </div>
      </main>

      <footer className="relative z-10 text-center text-xs text-zinc-500 py-6">
        LeadFlow — never lose a lead again.
      </footer>
    </div>
  );
}
