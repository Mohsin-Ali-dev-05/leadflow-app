"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AvailabilityToggle({
  userId,
  current,
}: {
  userId: string;
  current: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setLoading(true);
    await fetch("/api/team/availability", {
      method: "POST",
      body: JSON.stringify({ userId, availability: e.target.value }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <select
      disabled={loading}
      defaultValue={current}
      onChange={handleChange}
      className="text-xs border rounded p-1"
    >
      <option value="AVAILABLE">Available</option>
      <option value="BUSY">Busy</option>
      <option value="ON_LEAVE">On Leave</option>
      <option value="OFFLINE">Offline</option>
    </select>
  );
}
