import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  displayPremium,
  formatEnumLabel,
  formatUsd,
  toNumber,
  type HsPlan,
} from "@/lib/healthsherpa";

type Props = {
  plan: HsPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DOC_LABELS: ReadonlyArray<{ key: keyof NonNullable<HsPlan["documents"]>; label: string }> = [
  { key: "sbc_url", label: "Summary of benefits" },
  { key: "brochure_url", label: "Plan brochure" },
  { key: "formulary_url", label: "Drug formulary" },
  { key: "network_url", label: "Provider directory" },
  { key: "payment_url", label: "Plan payment details" },
];

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border/25 last:border-0">
    <span className="text-[12px] uppercase tracking-wider text-muted-foreground/70">{label}</span>
    <span className="text-sm font-semibold text-foreground tabular-nums text-right">{value}</span>
  </div>
);

/** Detail view for a single HealthSherpa quote result. */
export const HealthSherpaPlanModal = ({ plan, open, onOpenChange }: Props) => {
  const docs = plan?.documents ?? {};
  const links = DOC_LABELS.filter((entry) => typeof docs[entry.key] === "string" && docs[entry.key]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">
            {plan?.display_name ?? plan?.name ?? "Plan details"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {plan?.issuer?.name ?? "Carrier not reported"}
          </DialogDescription>
        </DialogHeader>

        {plan && (
          <div className="space-y-1">
            <Row label="Net premium" value={`${formatUsd(displayPremium(plan), true)}/mo`} />
            <Row label="Gross premium" value={`${formatUsd(plan.pricing?.gross_premium, true)}/mo`} />
            <Row label="Subsidy applied" value={formatUsd(plan.pricing?.subsidy_applied, true)} />
            {typeof toNumber(plan.pricing?.max_aptc) === "number" && (
              <Row label="Maximum APTC" value={formatUsd(plan.pricing.max_aptc, true)} />
            )}
            <Row label="Metal level" value={formatEnumLabel(plan.details?.metal_level)} />
            <Row label="Plan type" value={formatEnumLabel(plan.details?.plan_type)} />
            <Row label="Deductible" value={formatUsd(plan.details?.deductible_individual)} />
            <Row label="Out-of-pocket max" value={formatUsd(plan.details?.moop_individual)} />
            <Row label="Issuer" value={plan.issuer?.name ?? "Not reported"} />
          </div>
        )}

        {links.length > 0 && (
          <div className="pt-2 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
              Plan documents
            </p>
            {links.map((entry) => (
              <a
                key={entry.key}
                href={docs[entry.key] as string}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                {entry.label}
                <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
              </a>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
