import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/tenant";
import { pickAssignee } from "@/lib/assignment";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const { userId, availability } = await req.json();

  await prisma.user.update({
    where: { id: userId },
    data: { availability },
  });

  // If going on leave, reassign unacked leads
  if (availability === "ON_LEAVE" || availability === "OFFLINE") {
    const leads = await prisma.lead.findMany({
      where: { ownerId: userId, status: "UNACKED" },
    });
    for (const lead of leads) {
      const newOwner = await pickAssignee(user.workspaceId);
      if (newOwner) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { ownerId: newOwner },
        });
      }
    }
  }
  return NextResponse.json({ ok: true });
}
