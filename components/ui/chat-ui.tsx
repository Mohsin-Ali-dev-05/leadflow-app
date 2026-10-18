"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import { Input } from "./input";

export default function ChatUI({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: any[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);

    await fetch("/api/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, body }),
    });

    setBody("");
    setLoading(false);
    router.refresh(); // Refresh to show the new message
  }

  return (
    <div className="flex flex-col h-[500px] border rounded-xl bg-zinc-50 overflow-hidden">
      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {initialMessages.length === 0 ? (
          <p className="text-center text-sm text-zinc-500 mt-10">
            No messages yet.
          </p>
        ) : (
          initialMessages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.direction === "OUT" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                  m.direction === "OUT"
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-white border text-zinc-900 rounded-bl-sm shadow-sm"
                }`}
              >
                {m.body}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message..."
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !body.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
