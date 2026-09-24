import { Card, CardBody } from "./ui/Card";
import { PhoneCall, ExternalLink, ShieldAlert } from "lucide-react";

/**
 * One-tap fraud reporting. Shown once a request has landed on
 * STAYS-PAUSED/TIMED-OUT — i.e. the system (or the user, via a Tier rejection)
 * treated this as a likely scam.
 */
export function FraudReportCard() {
  return (
    <Card className="overflow-hidden border border-rose-500/40 bg-gradient-to-r from-rose-500/10 via-[var(--color-surface)] to-[var(--color-surface)] shadow-sm">
      <CardBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-950 dark:text-rose-200">
              Scam &amp; Fraud Emergency Incident
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)] leading-relaxed">
              Report immediately to the National Cyber Crime Portal or call the 1930 cyber fraud helpline.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href="tel:1930"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-[var(--color-surface-raised)] px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition-colors"
          >
            <PhoneCall className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            <span>Call 1930</span>
          </a>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 px-3.5 py-2 text-xs font-bold text-white hover:from-rose-500 hover:to-red-500 shadow-sm transition-all"
          >
            <span>cybercrime.gov.in</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardBody>
    </Card>
  );
}
