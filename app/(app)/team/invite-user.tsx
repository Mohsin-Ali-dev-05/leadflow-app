"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function InviteUser() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        role: form.get("role"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Invite failed");
      return;
    }
    setOpen(false);
    router.refresh();
    if (data.temporaryPassword) {
      alert(`Temporary password: ${data.temporaryPassword}`);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Invite teammate</Button>;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <Input name="name" placeholder="Name" required className="w-36" />
      <Input name="email" type="email" placeholder="Email" required className="w-48" />
      <select
        name="role"
        className="h-10 rounded-lg border border-zinc-300 px-2 text-sm"
        defaultValue="USER"
      >
        <option value="USER">USER</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      <Button type="submit" disabled={loading}>
        {loading ? "Inviting…" : "Invite"}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {error && <p className="text-sm text-rose-600 w-full">{error}</p>}
    </form>
  );
}
