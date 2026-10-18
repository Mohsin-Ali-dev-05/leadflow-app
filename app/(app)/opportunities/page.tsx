import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { Card, CardBody } from "@/components/ui/card";
import StageSelector from "./stage-selector";
import PayButton from "./pay-button";
import CreateOpportunity from "./create-opportunity";

export default async function OpportunitiesPage() {
  const user = await getSessionUser();
  if (!user) return null;

  // 1. Fetch Opportunities
  const opps = await prisma.opportunity.findMany({
    where: { workspaceId: user.workspaceId },
    include: { stage: true, contact: true },
    orderBy: { createdAt: "desc" },
  });

  // 2. Fetch Pipeline (needed for the Create form)
  const pipeline = await prisma.pipeline.findFirst({
    where: { workspaceId: user.workspaceId },
    include: { stages: { orderBy: { position: "asc" } } },
  });

  const canViewValue = can(user, "crm.value.view");

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Opportunities</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your active deals.
          </p>
        </div>

        {/* Render the CreateOpportunity modal button if a pipeline exists */}
        {pipeline && pipeline.stages.length > 0 ? (
          <CreateOpportunity
            pipelineId={pipeline.id}
            stageId={pipeline.stages[0].id}
          />
        ) : (
          <p className="text-sm text-rose-500">
            Create a pipeline in Settings first.
          </p>
        )}
      </div>

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium text-zinc-500">Title</th>
                <th className="px-6 py-3 font-medium text-zinc-500">Contact</th>
                <th className="px-6 py-3 font-medium text-zinc-500">Stage</th>
                <th className="px-6 py-3 font-medium text-zinc-500 text-right">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {opps.length === 0 ? (
                <tr>
                  <td className="px-6 py-4">
                    <StageSelector
                      oppId={opp.id}
                      currentStageId={opp.stageId}
                      stages={pipeline?.stages || []}
                    />
                  </td>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-zinc-500"
                  >
                    No opportunities yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                opps.map((opp) => (
                  <tr key={opp.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-4 font-medium">{opp.title}</td>
                    <td className="px-6 py-4 text-zinc-500">
                      {opp.contact?.name || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {opp.stage.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {/* Fixed the flex layout here to prevent table stretching */}
                      <div className="flex items-center justify-end gap-4">
                        <span>
                          {canViewValue ? (
                            `Rs. ${(opp.valueCents / 100).toFixed(0)}` // <--- Changed to Rs. and removed decimals
                          ) : (
                            <span className="text-zinc-400 italic">Hidden</span>
                          )}
                        </span>

                        {canViewValue && opp.valueCents > 0 && (
                          <PayButton
                            opportunityId={opp.id}
                            title={opp.title}
                            amountCents={opp.valueCents}
                          />
                        )}
                      </div>
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
