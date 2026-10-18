import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm, HttpError } from "@/lib/tenant";
import { getStripe, paymentCurrency } from "@/lib/stripe";
import { audit } from "@/lib/audit";

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requirePerm("crm.edit");
  const body = await req.json().catch(() => ({}));
  const opportunityId = String(body.opportunityId || "");
  const opp = await prisma.opportunity.findFirst({
    where: { id: opportunityId, workspaceId: user.workspaceId },
  });
  if (!opp) throw new HttpError(404, "Opportunity not found");
  const amountCents = Number(body.amountCents ?? opp.valueCents);
  if (!Number.isInteger(amountCents) || amountCents < 50) {
    throw new HttpError(400, "Invalid amount");
  }
  const currency = paymentCurrency();
  const stripe = getStripe();
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency,
          product_data: { name: opp.title },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${appUrl}/opportunities/${opp.id}?payment=success`,
    cancel_url: `${appUrl}/opportunities/${opp.id}?payment=cancelled`,
    metadata: {
      opportunityId: opp.id,
      workspaceId: user.workspaceId,
      amountCents: String(amountCents),
    },
  });

  const payment = await prisma.payment.create({
    data: {
      workspaceId: user.workspaceId,
      opportunityId: opp.id,
      amountCents,
      currency,
      status: "PENDING",
      providerRef: session.id,
    },
  });
  await audit({
    workspaceId: user.workspaceId,
    actorId: user.id,
    eventType: "payment.created",
    targetId: payment.id,
    metadata: { opportunityId: opp.id, amountCents },
  });
  return NextResponse.json({ url: session.url, paymentId: payment.id });
});
