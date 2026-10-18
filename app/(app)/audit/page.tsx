import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { Card, CardBody } from "@/components/ui/card";
import { notFound } from "next/navigation";
import { History } from "lucide-react";

export default async function AuditLogPage() {
  const user = await getSessionUser();
  if (!user) return null;

  // F4.2 Restricted visibility
  if (!can(user, "audit.view")) {
    notFound();
  }

  const logs = await prisma.auditLog.findMany({
    where: { workspaceId: user.workspaceId },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 100, // Pagination limit for performance
  });

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
          <History className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Audit History</h1>
          <p className="text-sm text-zinc-500 mt-1">
            A tamper-proof record of all important actions.
          </p>
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium text-zinc-500">Time</th>
                <th className="px-6 py-3 font-medium text-zinc-500">Actor</th>
                <th className="px-6 py-3 font-medium text-zinc-500">Event</th>
                <th className="px-6 py-3 font-medium text-zinc-500">
                  Target ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-zinc-500"
                  >
                    No events recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-4 text-zinc-500">
                      {log.createdAt.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {log.actorType === "system" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-200 text-zinc-800">
                          System
                        </span>
                      ) : (
                        log.actor?.name || "Unknown User"
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {log.eventType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                      {log.targetId}
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
