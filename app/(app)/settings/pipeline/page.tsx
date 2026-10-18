import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import CreatePipelineButton from "./create-button";
import StageSettings from "./stage-settings"; // We'll create this next

export default async function PipelineSettingsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  let pipeline = await prisma.pipeline.findFirst({
    where: { workspaceId: user.workspaceId },
    include: { stages: { orderBy: { position: "asc" } }, customFields: true },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pipeline Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Configure stages and required fields.
        </p>
      </div>

      {!pipeline ? (
        <Card>
          <CardBody className="text-center py-12">
            <p className="mb-4 text-zinc-500">No pipeline exists yet.</p>
            <CreatePipelineButton />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{pipeline.name} Stages</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <StageSettings pipelineId={pipeline.id} stages={pipeline.stages} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
