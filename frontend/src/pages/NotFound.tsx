import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export function NotFound() {
  useDocumentTitle("Page Not Found — SafeSignal");
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-lg shadow-cyan-950/20">
        <ShieldAlert className="h-8 w-8 text-[var(--color-brand)]" />
      </div>
      <h1 className="text-2xl font-black tracking-tight text-[var(--color-text)]">404 — Page Not Found</h1>
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
        The requested screen or incident record could not be found, or belongs to a different persona than your active session.
      </p>
      <div className="pt-2">
        <Link to="/">
          <Button variant="primary" className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to SafeSignal Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

