"use client";

import { useRouter } from "next/navigation";

export default function AvailabilitySelector({
  userId,
  value,
  self,
}: {
  userId: string;
  value: string;
  self?: boolean;
}) {
  const router = useRouter();

  async function onChange(availability: string) {
    const url = self ? "/api/team/me" : `/api/team/${userId}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ availability }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Could not update availability");
      return;
    }
    router.refresh();
  }

  return (
    <select
      defaultValue={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-sm"
    >
      <option value="AVAILABLE">AVAILABLE</option>
      <option value="BUSY">BUSY</option>
      <option value="ON_LEAVE">ON_LEAVE</option>
      <option value="OFFLINE">OFFLINE</option>
    </select>
  );
}
