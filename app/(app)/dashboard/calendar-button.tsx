"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CalendarButton({
  isConnected,
}: {
  isConnected: boolean;
}) {
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  if (!isConnected) {
    return (
      <a href="/api/auth/google" className="block mt-2">
        <Button className="w-full bg-blue-600 hover:bg-blue-700">
          Connect Google Calendar
        </Button>
      </a>
    );
  }

  async function book(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/calendar/book", {
      method: "POST",
      body: JSON.stringify({
        title: "Client Consultation",
        startTime: date,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setMsg("Booked! Check your Google Calendar.");
    else setMsg(data.error);
  }

  return (
    <form onSubmit={book} className="space-y-3 mt-2">
      <Input
        type="datetime-local"
        required
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Booking..." : "Book Real Calendar Event"}
      </Button>
      {msg && (
        <p className="text-xs text-center text-emerald-600 font-medium">
          {msg}
        </p>
      )}
    </form>
  );
}
