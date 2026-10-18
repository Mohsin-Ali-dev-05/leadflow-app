"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

export default function PayButton({
  opportunityId,
  title,
  amountCents,
}: {
  opportunityId: string;
  title: string;
  amountCents: number;
}) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ opportunityId, amountCents, title }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe
      } else {
        alert(data.error || "Failed to create checkout session");
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred");
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handlePay}
      disabled={loading}
      size="sm"
      variant="outline"
      className="gap-2"
    >
      <CreditCard className="h-4 w-4" />
      {loading ? "Loading..." : "Pay"}
    </Button>
  );
}
