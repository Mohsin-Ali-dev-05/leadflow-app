import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm, HttpError } from "@/lib/tenant";
import { getStripe } from "@/lib/stripe";
import { audit } from "@/lib/audit";

export const POST = handleRoute(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const user = await requirePerm("integrations.manage");
    const payment = await prisma.payment.findFirst({
      where: { id, workspaceId: user.workspaceId },
    });
    if (!payment) throw new HttpError(404, "Not found");
    if (payment.status !== "PAID") {
      throw new HttpError(400, "Only paid charges can be refunded");
    }
    if (!payment.paymentIntentId) {
      throw new HttpError(
        409,
        "Payment intent is not yet on file. Wait for the Stripe webhook.",
      );
    }
    const stripe = getStripe();
    const refund = await stripe.refunds.create({
      payment_intent: payment.paymentIntentId,
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "REFUND_PENDING" },
    });
    await audit({
      workspaceId: user.workspaceId,
      actorId: user.id,
      eventType: "payment.refund_requested",
      targetId: payment.id,
      metadata: { refundId: refund.id },
    });
    return NextResponse.json({ ok: true, refundId: refund.id });
  },
);
