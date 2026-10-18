import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  companyName: z.string().min(1).max(80),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { name, email, password, companyName } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Phase-1 rule: email is globally unique at signup so login is unambiguous.
  const existing = await prisma.user.findFirst({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name: companyName, ackWindowSeconds: 60 },
    });
    const user = await tx.user.create({
      data: {
        workspaceId: workspace.id,
        email: normalizedEmail,
        name,
        passwordHash: await hashPassword(password),
        baseRole: "OWNER",
        availability: "AVAILABLE",
      },
    });
    await tx.pipeline.create({
      data: {
        workspaceId: workspace.id,
        name: "Sales Pipeline",
        stages: {
          create: [
            { name: "New", position: 0 },
            { name: "Contacted", position: 1 },
            { name: "Proposal", position: 2, requiredFieldKeys: ["budget"] },
            { name: "Closed Won", position: 3 },
          ],
        },
        customFields: {
          create: [
            { key: "budget", label: "Estimated Budget", type: "number" },
            { key: "timeline", label: "Timeline", type: "text" },
          ],
        },
      },
    });
    return { workspace, user };
  });

  await createSession(result.user.id);
  return NextResponse.json({ ok: true });
}
