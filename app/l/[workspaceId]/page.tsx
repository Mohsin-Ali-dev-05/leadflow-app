"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

export default function PublicFormPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    await fetch("/api/public/lead", {
      method: "POST",
      body: JSON.stringify({
        workspaceId: params.workspaceId,
        name: form.get("name"),
        email: form.get("email"),
      }),
    });
    setDone(true);
    setLoading(false);
  }

  if (done)
    return (
      <div className="min-h-screen grid place-items-center bg-zinc-50">
        <h1 className="text-2xl font-bold text-emerald-600">
          Thank you! We will be in touch.
        </h1>
      </div>
    );

  return (
    <div className="min-h-screen grid place-items-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input name="name" placeholder="Your Name" required />
            <Input
              name="email"
              type="email"
              placeholder="Your Email"
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Submit"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
