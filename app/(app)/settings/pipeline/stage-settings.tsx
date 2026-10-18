"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

export default function StageSettings({
  pipelineId,
  stages,
}: {
  pipelineId: string;
  stages: any[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function addStage(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    await fetch("/api/pipelines/stages", {
      method: "POST",
      body: JSON.stringify({ pipelineId, name }),
    });
    setName("");
    setLoading(false);
    router.refresh();
  }

  async function deleteStage(id: string) {
    if (!confirm("Are you sure?")) return;
    const res = await fetch(`/api/pipelines/stages/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {stages.map((stage, i) => (
        <div
          key={stage.id}
          className="flex items-center justify-between p-4 border rounded-lg bg-zinc-50"
        >
          <div className="flex items-center gap-4">
            <span className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center text-sm font-bold">
              {i + 1}
            </span>
            <div className="font-medium">{stage.name}</div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => deleteStage(stage.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <form onSubmit={addStage} className="flex gap-2 pt-4 border-t">
        <Input
          placeholder="New Stage Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Stage"}
        </Button>
      </form>
    </div>
  );
}
