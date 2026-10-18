"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export default function SimulateButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function simulate() {
    setLoading(true);
    const randomPhone = `+92300${Math.floor(1000000 + Math.random() * 9000000)}`;

    await fetch("/api/webhooks/twilio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        From: randomPhone,
        ProfileName: "John Doe",
        Body: "Hi, I am interested in your services. Please call me back.",
      }),
    });

    setLoading(false);
    router.refresh(); // Refresh the page to show the new lead
  }

  return (
    <Button
      onClick={simulate}
      disabled={loading}
      variant="outline"
      className="gap-2"
    >
      <MessageSquare className="h-4 w-4" />
      {loading ? "Simulating..." : "Simulate Incoming WhatsApp"}
    </Button>
  );
}
