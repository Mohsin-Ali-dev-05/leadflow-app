import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm } from "@/lib/tenant";

export const GET = handleRoute(async () => {
  const user = await requirePerm("crm.view");
  const conversations = await prisma.conversation.findMany({
    where: { workspaceId: user.workspaceId },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(conversations);
});
