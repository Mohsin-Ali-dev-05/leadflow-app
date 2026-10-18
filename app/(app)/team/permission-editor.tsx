"use client";

import { useRouter } from "next/navigation";
import { asRecord } from "@/lib/json";

const PERMS = [
  "crm.view",
  "crm.create",
  "crm.edit",
  "crm.delete",
  "crm.export",
  "crm.value.view",
  "rules.manage",
  "integrations.manage",
  "audit.view",
  "users.manage",
] as const;

export default function PermissionEditor({
  userId,
  permissions,
}: {
  userId: string;
  permissions: unknown;
}) {
  const router = useRouter();
  const current = asRecord(permissions);

  async function toggle(key: string, enabled: boolean) {
    const next = { ...current, [key]: enabled };
    const res = await fetch(`/api/team/${userId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ permissions: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Could not update permissions");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {PERMS.map((p) => {
        const on = current[p] === true;
        const off = current[p] === false;
        return (
          <label key={p} className="text-[11px] flex items-center gap-1 border rounded px-2 py-1">
            <input
              type="checkbox"
              checked={on}
              onChange={(e) => toggle(p, e.target.checked)}
            />
            <span className={off ? "line-through text-zinc-400" : ""}>{p}</span>
          </label>
        );
      })}
    </div>
  );
}
