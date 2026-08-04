import { CarrierLogo } from "@/components/plan/CarrierLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  displayPremium,
  formatEnumLabel,
  formatUsd,
  toNumber,
  type HsPlan,
} from "@/lib/healthsherpa";

type Props = {
  plan: HsPlan;
  onViewDetails: (plan: HsPlan) => void;
};

/** Single quote result rendered from the HealthSherpa `plans` array. */
export const HealthSherpaPlanCard = ({ plan, onViewDetails }: Props) => {
  const net = displayPremium(plan);
  const gross = toNumber(plan.pricing?.gross_premium);
  const subsidy = toNumber(plan.pricing?.subsidy_applied);

  return (
    <div className="bg-white border border-border/40 rounded-2xl p-5 hover:border-primary/25 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <CarrierLogo name={plan.issuer?.name} className="h-10 w-10 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate text-[12px] text-muted-foreground/80">
              {plan.issuer?.name ?? "Carrier not reported"}
            </p>
            <h3 className="text-[15px] font-semibold text-foreground leading-snug mt-1">
              {plan.display_name ?? plan.name ?? "Marketplace plan"}
            </h3>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <Badge variant="secondary" className="text-[11px] font-medium">
                {formatEnumLabel(plan.details?.metal_level)}
              </Badge>
              <Badge variant="secondary" className="text-[11px] font-medium">
                {formatEnumLabel(plan.details?.plan_type)}
              </Badge>
            </div>
          </div>
        </div>


        <div className="text-right shrink-0">
          <p className="text-xl font-bold text-foreground tabular-nums leading-none">
            {formatUsd(net)}
            <span className="text-[11px] font-medium text-muted-foreground/70">/mo</span>
          </p>
          {typeof gross === "number" && gross !== net && (
            <p className="text-[11px] text-muted-foreground/60 mt-1 tabular-nums">
              {formatUsd(gross)} before subsidy
            </p>
          )}
          {typeof subsidy === "number" && subsidy > 0 && (
            <p className="text-[11px] text-primary font-medium mt-0.5 tabular-nums">
              {formatUsd(subsidy)} subsidy applied
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-4 pt-3.5 border-t border-border/25">
        <div className="text-[11px] text-muted-foreground/70 tabular-nums">
          Deductible {formatUsd(plan.details?.deductible_individual)} · Out-of-pocket max{" "}
          {formatUsd(plan.details?.moop_individual)}
        </div>
        <Button variant="outline" size="sm" className="text-xs" onClick={() => onViewDetails(plan)}>
          View details
        </Button>
      </div>
    </div>
  );
};
