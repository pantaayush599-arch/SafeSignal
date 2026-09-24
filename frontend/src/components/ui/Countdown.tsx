import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Countdown({ expiresAt, className = "" }: { expiresAt: string; className?: string }) {
  const target = new Date(expiresAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = target - now;
  const expired = remaining <= 0;
  const isUrgent = remaining > 0 && remaining < 60000;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs tabular font-medium ${
        expired
          ? "text-rose-600 dark:text-rose-400"
          : isUrgent
          ? "text-amber-600 dark:text-amber-400 animate-pulse"
          : "text-[var(--color-text-muted)]"
      } ${className}`}
      aria-live="polite"
    >
      <Clock
        className={`h-3.5 w-3.5 shrink-0 ${
          expired
            ? "text-rose-600 dark:text-rose-400"
            : isUrgent
            ? "text-amber-600 dark:text-amber-400"
            : "text-[var(--color-brand)]"
        }`}
      />
      <span>{expired ? "Expired" : formatRemaining(remaining)}</span>
    </span>
  );
}
