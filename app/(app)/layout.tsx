import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  Zap,
  LayoutDashboard,
  Users,
  LogOut,
  Settings,
  Target,
  Inbox,
  ShieldAlert,
  History,
  Contact,
} from "lucide-react";
import LogoutButton from "./logout-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-60 flex-col border-r border-zinc-200 bg-white">
        <div className="h-16 px-6 flex items-center border-b border-zinc-200">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <span className="h-8 w-8 rounded-lg bg-indigo-600 text-white grid place-items-center">
              <Zap className="h-4 w-4" />
            </span>
            LeadFlow
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavItem
            href="/dashboard"
            icon={<LayoutDashboard className="h-4 w-4" />}
          >
            Dashboard
          </NavItem>
          <NavItem href="/leads" icon={<Inbox className="h-4 w-4" />}>
            Leads
          </NavItem>
          <NavItem href="/contacts" icon={<Contact className="h-4 w-4" />}>
            Contacts
          </NavItem>
          <NavItem href="/opportunities" icon={<Target className="h-4 w-4" />}>
            Opportunities
          </NavItem>
          <NavItem href="/recovery" icon={<ShieldAlert className="h-4 w-4" />}>
            Recovery Queue
          </NavItem>

          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Admin
            </p>
          </div>

          <NavItem href="/audit" icon={<History className="h-4 w-4" />}>
            Audit History
          </NavItem>
          <NavItem
            href="/settings/pipeline"
            icon={<Settings className="h-4 w-4" />}
          >
            Pipeline Settings
          </NavItem>
          <NavItem href="/team" icon={<Users className="h-4 w-4" />}>
            Team
          </NavItem>
        </nav>

        <div className="p-3 border-t border-zinc-200">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center text-xs font-semibold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-xs text-zinc-500 truncate">{user.email}</div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header (Mobile) */}
        <header className="h-16 border-b border-zinc-200 bg-white px-6 flex items-center md:hidden">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <span className="h-8 w-8 rounded-lg bg-indigo-600 text-white grid place-items-center">
              <Zap className="h-4 w-4" />
            </span>
            LeadFlow
          </Link>
        </header>

        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-indigo-600 transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}
