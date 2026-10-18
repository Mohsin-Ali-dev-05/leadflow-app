"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RoleSelector({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentRole);

  async function onChange(role: string) {
    setValue(role);
    const res = await fetch(`/api/team/${userId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Could not change role");
      setValue(currentRole);
      return;
    }
    router.refresh();
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-sm"
    >
      <option value="USER">USER</option>
      <option value="ADMIN">ADMIN</option>
    </select>
  );
}
