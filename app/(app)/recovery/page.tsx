import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/card";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default async function RecoveryQueuePage() {
  const user = await getSessionUser();
  if (!user) return null;

  // Fetch leads that are ESCALATED (hit max level) or UNACKED and past deadline
  const leads = await prisma.lead.findMany({
    where: {
      workspaceId: user.workspaceId,
      OR: [
        { status: "ESCALATED" },
        { status: "UNACKED", ackDeadline: { lt: new Date() } },
      ],
    },
    include: { owner: true, contact: true },
    orderBy: { assignedAt: "desc" },
  });

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Recovery Queue</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Leads that have been ignored or maxed out on escalations.
          </p>
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium text-zinc-500">Contact</th>
                <th className="px-6 py-3 font-medium text-zinc-500">
                  Current Owner
                </th>
                <th className="px-6 py-3 font-medium text-zinc-500">
                  Escalation Level
                </th>
                <th className="px-6 py-3 font-medium text-zinc-500 text-rose-600">
                  Reason
                </th>
                <th className="px-6 py-3 font-medium text-zinc-500 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {leads.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-zinc-500"
                  >
                    No leads in the recovery queue. Great job!
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-4 font-medium">
                      {lead.contact?.name || "Unknown"}
                    </td>
                    <td className="px-6 py-4">
                      {lead.owner?.name || "Unassigned"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-rose-100 text-rose-700 font-bold text-xs">
                        {lead.escalationLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-rose-600 font-medium">
                      {lead.status === "ESCALATED"
                        ? "Max escalations reached"
                        : "Unacknowledged beyond deadline"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-indigo-600 font-medium hover:underline"
                      >
                        Rescue
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
