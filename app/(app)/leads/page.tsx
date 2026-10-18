import SimulateButton from "./simulate-button";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/card";
import Countdown from "@/components/countdown";
import Link from "next/link";
import AutoRefresh from "@/components/auto-refresh";

export default async function LeadsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const leads = await prisma.lead.findMany({
    where: { workspaceId: user.workspaceId },
    include: { owner: true, contact: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Leads Engine</h1>
        <AutoRefresh />
        <SimulateButton />
      </div>
      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium text-zinc-500">Contact</th>
                <th className="px-6 py-3 font-medium text-zinc-500">Source</th>
                <th className="px-6 py-3 font-medium text-zinc-500">Owner</th>
                <th className="px-6 py-3 font-medium text-zinc-500">Status</th>
                <th className="px-6 py-3 font-medium text-zinc-500 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4 font-medium">
                    {lead.contact?.name || "Unknown"}
                  </td>
                  <td className="px-6 py-4 text-zinc-500">{lead.source}</td>
                  <td className="px-6 py-4">
                    {lead.owner?.name || "Unassigned"}
                  </td>
                  <td className="px-6 py-4">
                    {lead.status === "UNACKED" ? (
                      <Countdown deadline={lead.ackDeadline.toISOString()} />
                    ) : (
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${
                          lead.status === "ACKED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {lead.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-indigo-600 font-medium hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
