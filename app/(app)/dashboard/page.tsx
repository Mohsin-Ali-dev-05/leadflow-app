import { getSessionUser } from "@/lib/auth";
import CalendarButton from "./calendar-button";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Inbox,
  AlertCircle,
  DollarSign,
  ShieldAlert,
  ArrowRight,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { AnimatedCard } from "@/components/ui/animated-card";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const gcalConnection = await prisma.calendarConnection.findUnique({
    where: { userId: user.id },
  });

  const isManager = user.baseRole === "OWNER" || user.baseRole === "ADMIN";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Fetch Dashboard Metrics
  const [
    newLeadsToday,
    totalOpenLeads,
    recoveryLeads,
    escalations24h,
    pipelineValue,
  ] = await Promise.all([
    prisma.lead.count({
      where: {
        workspaceId: user.workspaceId,
        createdAt: { gte: startOfToday },
        ...(isManager ? {} : { ownerId: user.id }),
      },
    }),
    prisma.lead.count({
      where: {
        workspaceId: user.workspaceId,
        status: { in: ["UNACKED", "ACKED"] },
        ...(isManager ? {} : { ownerId: user.id }),
      },
    }),
    prisma.lead.count({
      where: {
        workspaceId: user.workspaceId,
        OR: [
          { status: "ESCALATED" },
          { status: "UNACKED", ackDeadline: { lt: new Date() } },
        ],
      },
    }),
    prisma.auditLog.count({
      where: {
        workspaceId: user.workspaceId,
        eventType: "lead.escalated",
        createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
      },
    }),
    prisma.opportunity.aggregate({
      _sum: { valueCents: true },
      where: { workspaceId: user.workspaceId },
    }),
  ]);

  const canViewValue = can(user, "crm.value.view");
  const pipelineTotal = (pipelineValue._sum.valueCents || 0) / 100;

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Welcome back, {user.name.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Here is what is happening in your workspace today.
        </p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AnimatedCard delay={0.1}>
          <Link href="/leads" className="block group h-full">
            <Card className="h-full transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md group-hover:border-indigo-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">
                  New Leads Today
                </CardTitle>
                <Inbox className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardBody>
                <div className="text-3xl font-bold text-zinc-900">
                  {newLeadsToday}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Assigned to {isManager ? "team" : "you"}
                </p>
              </CardBody>
            </Card>
          </Link>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <Link href="/leads" className="block group h-full">
            <Card className="h-full transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md group-hover:border-indigo-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">
                  Total Open Leads
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardBody>
                <div className="text-3xl font-bold text-zinc-900">
                  {totalOpenLeads}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Currently waiting for action
                </p>
              </CardBody>
            </Card>
          </Link>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <Link href="/opportunities" className="block group h-full">
            <Card className="h-full transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md group-hover:border-indigo-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">
                  Open Pipeline
                </CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardBody>
                <div className="text-3xl font-bold text-zinc-900">
                  {canViewValue
                    ? `Rs. ${pipelineTotal.toLocaleString()}`
                    : "Hidden"}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Projected revenue</p>
              </CardBody>
            </Card>
          </Link>
        </AnimatedCard>

        <AnimatedCard delay={0.4}>
          <Link href="/recovery" className="block group h-full">
            <Card className="h-full transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md border-rose-100 bg-rose-50/30 group-hover:border-rose-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-rose-700">
                  Recovery Queue
                </CardTitle>
                <ShieldAlert className="h-4 w-4 text-rose-600" />
              </CardHeader>
              <CardBody>
                <div className="text-3xl font-bold text-rose-700">
                  {recoveryLeads}
                </div>
                <p className="text-xs text-rose-600/80 mt-1">
                  Needs immediate attention
                </p>
              </CardBody>
            </Card>
          </Link>
        </AnimatedCard>
      </div>

      {/* Secondary Section - 3 Columns now */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnimatedCard delay={0.5}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="font-medium text-sm">Lead Escalations (24h)</p>
                  <p className="text-xs text-zinc-500">
                    Automatic reassignments
                  </p>
                </div>
                <span
                  className={`text-xl font-bold ${escalations24h > 0 ? "text-amber-600" : "text-emerald-600"}`}
                >
                  {escalations24h}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Your Availability</p>
                  <p className="text-xs text-zinc-500">Receiving leads?</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  {user.availability}
                </span>
              </div>
            </CardBody>
          </Card>
        </AnimatedCard>

        {/* Google Calendar Card */}
        <AnimatedCard delay={0.6}>
          <Card className="bg-white border-blue-100 h-full shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Google Calendar</CardTitle>
              <Calendar className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardBody>
              <p className="text-xs text-zinc-500 mb-4">
                Connect your account to book real appointments.
              </p>
              <CalendarButton isConnected={!!gcalConnection} />
            </CardBody>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={0.7}>
          <Card className="bg-indigo-600 text-white border-indigo-700 h-full">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <Link
                href="/leads"
                className="flex items-center justify-between bg-indigo-700/50 hover:bg-indigo-700 p-3 rounded-lg transition-colors border border-indigo-500/30"
              >
                <span className="font-medium text-sm">Go to Leads Engine</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/settings/pipeline"
                className="flex items-center justify-between bg-indigo-700/50 hover:bg-indigo-700 p-3 rounded-lg transition-colors border border-indigo-500/30"
              >
                <span className="font-medium text-sm">Configure Pipeline</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardBody>
          </Card>
        </AnimatedCard>
      </div>
    </div>
  );
}
