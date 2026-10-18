"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CreateOpportunity({
  pipelineId,
  stageId,
}: {
  pipelineId: string;
  stageId: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pipelineId,
        stageId,
        title: form.get("title"),
        valueCents: Number(form.get("value")) * 100, // Convert dollars to cents
      }),
    });

    setLoading(false);
    if (res.ok) {
      setIsOpen(false);
      router.refresh();
    } else {
      alert("Failed to create opportunity");
    }
  }

  if (!isOpen) {
    return <Button onClick={() => setIsOpen(true)}>New Opportunity</Button>;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Opportunity</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Deal Title</label>
            <Input
              name="title"
              required
              placeholder="e.g., Solar Panel Installation"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Value (PKR)
            </label>
            <Input
              name="value"
              type="number"
              required
              placeholder="500"
              min="1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Deal"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
