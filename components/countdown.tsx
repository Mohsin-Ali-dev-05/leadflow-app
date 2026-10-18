"use client";
import { useEffect, useState } from "react";

export default function Countdown({
  deadline,
  onExpire,
}: {
  deadline: string;
  onExpire?: () => void;
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const target = new Date(deadline).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((target - now) / 1000);
      setSeconds(diff > 0 ? diff : 0);
      if (diff <= 0 && onExpire) onExpire();
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  if (seconds <= 0)
    return (
      <span className="text-rose-600 font-bold text-sm">Escalating...</span>
    );
  return (
    <span className="text-amber-600 font-bold text-sm bg-amber-50 px-2 py-1 rounded-md">
      {seconds}s remaining
    </span>
  );
}
