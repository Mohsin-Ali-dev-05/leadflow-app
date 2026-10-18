"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StageSelector({
  oppId,
  currentStageId,
  stages,
}: {
  oppId: string;
  currentStageId: string;
  stages: any[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setLoading(true);
    const res = await fetch(`/api/opportunities/${oppId}`, {
      method: "PATCH",
      body: JSON.stringify({ stageId: e.target.value }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error); // Shows the required field validation error!
      e.target.value = currentStageId; // revert
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <select
      disabled={loading}
      defaultValue={currentStageId}
      onChange={handleChange}
      className="text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 outline-none border border-indigo-200 cursor-pointer"
    >
      {stages.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
