"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function CreatePipelineButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/pipelines", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Sales Pipeline" }), // Sending valid JSON
    });

    setLoading(false);

    if (res.ok) {
      router.refresh(); // This will reload the server component and show the stages!
    } else {
      const data = await res.json();
      setError(data.error || "Something went wrong");
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={handleCreate} disabled={loading}>
        {loading ? "Creating..." : "Create Default Pipeline"}
      </Button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
