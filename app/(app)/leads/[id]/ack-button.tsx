"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function AcknowledgeButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAck() {
    setLoading(true);
    await fetch(`/api/leads/${leadId}/ack`, { method: "POST" });
    router.refresh(); // Refresh server component
  }

  return (
    <Button onClick={handleAck} disabled={loading} className="w-full">
      {loading ? "Acknowledging..." : "Acknowledge Lead"}
    </Button>
  );
}
