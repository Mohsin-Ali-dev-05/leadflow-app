"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const ALL_PERMS = [
  "crm.delete",
  "crm.export",
  "crm.value.view",
  "audit.view",
  "integrations.manage",
];

export default function PermissionsEditor({ user }: { user: any }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [perms, setPerms] = useState<any>(user.permissions || {});

  async function save() {
    await fetch("/api/team/permissions", {
      method: "POST",
      body: JSON.stringify({ userId: user.id, permissions: perms }),
    });
    setIsOpen(false);
    router.refresh();
  }

  if (!isOpen)
    return (
      <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
        Edit
      </Button>
    );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96 space-y-4">
        <h3 className="font-bold">Permissions for {user.name}</h3>
        <div className="space-y-2">
          {ALL_PERMS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={perms[p] || false}
                onChange={(e) => setPerms({ ...perms, [p]: e.target.checked })}
              />
              {p}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </div>
  );
}
