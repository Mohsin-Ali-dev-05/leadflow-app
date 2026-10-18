import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/card";
import PermissionsEditor from "./permissions-editor";
import AvailabilityToggle from "./availability-toggle";

export default async function TeamPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const team = await prisma.user.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Team Management</h1>
      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium text-zinc-500">Name</th>
                <th className="px-6 py-3 font-medium text-zinc-500">Role</th>
                <th className="px-6 py-3 font-medium text-zinc-500">
                  Availability
                </th>
                <th className="px-6 py-3 font-medium text-zinc-500 text-right">
                  Permissions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {team.map((member) => (
                <tr key={member.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{member.name}</div>
                    <div className="text-xs text-zinc-500">{member.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-zinc-100 rounded text-xs font-medium">
                      {member.baseRole}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <AvailabilityToggle
                      userId={member.id}
                      current={member.availability}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {member.baseRole !== "OWNER" && (
                      <PermissionsEditor user={member} />
                    )}
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
