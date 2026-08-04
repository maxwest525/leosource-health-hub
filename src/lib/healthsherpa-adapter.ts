import type { CmsPlan } from "@/lib/cms";
import type { HsPlan } from "@/lib/healthsherpa";
import { formatEnumLabel, toNumber } from "@/lib/healthsherpa-format";

/**
 * Maps a HealthQuote Pro plan onto the CMS plan shape the comparison UI
 * already renders, so cards, sorting, and side-by-side compare work unchanged.
 */
export const hsPlanToCmsPlan = (plan: HsPlan): CmsPlan => {
  const gross = toNumber(plan.pricing?.gross_premium);
  const net = toNumber(plan.pricing?.net_premium);
  const premium = gross ?? net ?? 0;
  const premiumWithCredit = net ?? gross ?? 0;

  const deductibleIndividual = toNumber(plan.details?.deductible_individual);
  const deductibleFamily = toNumber(plan.details?.deductible_family);
  const moopIndividual = toNumber(plan.details?.moop_individual);
  const moopFamily = toNumber(plan.details?.moop_family);

  const benefits: CmsPlan["benefits"] = [];
  if (plan.details?.primary_care_summary) {
    benefits.push({
      name: "Primary Care Visit",
      covered: true,
      cost_sharings: [{ display_string: plan.details.primary_care_summary }],
    });
  }
  if (plan.details?.specialist_summary) {
    benefits.push({
      name: "Specialist Visit",
      covered: true,
      cost_sharings: [{ display_string: plan.details.specialist_summary }],
    });
  }

  return {
    id: plan.plan_id,
    name: plan.display_name ?? plan.name ?? "Marketplace plan",
    issuer: { name: plan.issuer?.name ?? "Carrier", id: plan.issuer?.issuer_id },
    premium,
    premium_w_credit: premiumWithCredit,
    metal_level: formatEnumLabel(plan.details?.metal_level).replace(/^Expanded /, ""),
    type: formatEnumLabel(plan.details?.plan_type ?? plan.network?.type ?? plan.details?.type),
    hsa_eligible: plan.details?.hsa_eligible ?? undefined,
    deductibles: [
      ...(deductibleIndividual !== undefined
        ? [{ type: "Medical Deductible (Individual)", amount: deductibleIndividual }]
        : []),
      ...(deductibleFamily !== undefined
        ? [{ type: "Medical Deductible (Family)", amount: deductibleFamily }]
        : []),
    ],
    moops: [
      ...(moopIndividual !== undefined
        ? [{ type: "Medical Maximum Out of Pocket (Individual)", amount: moopIndividual }]
        : []),
      ...(moopFamily !== undefined
        ? [{ type: "Medical Maximum Out of Pocket (Family)", amount: moopFamily }]
        : []),
    ],
    benefits,
    benefits_url: plan.documents?.sbc_url ?? undefined,
    brochure_url: plan.documents?.brochure_url ?? undefined,
    formulary_url: plan.documents?.formulary_url ?? undefined,
    network_url: plan.documents?.network_url ?? plan.network?.network_url ?? undefined,
    subsidy_applied: toNumber(plan.pricing?.subsidy_applied ?? undefined),
    max_aptc: toNumber(plan.pricing?.max_aptc ?? undefined),
    network_name: plan.network?.name ?? undefined,
    payment_url: plan.documents?.payment_url ?? undefined,
  };
};

/** Subsidy applied to a plan, when HealthQuote Pro reports one. */
export const hsSubsidy = (plan: HsPlan): number | undefined =>
  toNumber(plan.pricing?.subsidy_applied ?? undefined);
