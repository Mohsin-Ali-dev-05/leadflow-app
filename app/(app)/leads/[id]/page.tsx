import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { notFound } from "next/navigation";
import Countdown from "@/components/countdown";
import AcknowledgeButton from "./ack-button";
import ChatUI from "@/components/ui/chat-ui"; // <-- Import Chat UI

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return null;

  const lead = await prisma.lead.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: { owner: true, contact: true },
  });

  if (!lead) notFound();

  // Fetch the conversation and messages
  const conversation = await prisma.conversation.findFirst({
    where: { workspaceId: user.workspaceId, contactId: lead.contactId! },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <div className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left Column: Lead Info */}
      <div className="md:col-span-1 space-y-6">
        <h1 className="text-2xl font-semibold">Lead Details</h1>
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
              <span className="text-zinc-500 text-sm">Contact</span>
              <span className="font-medium text-sm">{lead.contact?.name}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-4">
              <span className="text-zinc-500 text-sm">Owner</span>
              <span className="font-medium text-sm">{lead.owner?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 text-sm">Status</span>
              {lead.status === "UNACKED" ? (
                <Countdown deadline={lead.ackDeadline.toISOString()} />
              ) : (
                <span className="font-medium text-sm text-emerald-600">
                  {lead.status}
                </span>
              )}
            </div>

            {lead.status === "UNACKED" && lead.ownerId === user.id && (
              <div className="pt-4">
                <AcknowledgeButton leadId={lead.id} />
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Right Column: Chat UI */}
      <div className="md:col-span-2 space-y-6">
        <h2 className="text-xl font-semibold mt-1">Conversation</h2>
        {conversation ? (
          <ChatUI
            conversationId={conversation.id}
            initialMessages={conversation.messages}
          />
        ) : (
          <Card>
            <CardBody className="text-center text-zinc-500 py-10">
              No conversation exists for this contact yet.
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
