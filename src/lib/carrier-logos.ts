import aetnaLogo from "@/assets/carriers/aetna.png";
import ambetterLogo from "@/assets/carriers/ambetter.png";
import bcbsLogo from "@/assets/carriers/bcbs.png";
import cignaLogo from "@/assets/carriers/cigna.png";
import molinaLogo from "@/assets/carriers/molina.png";
import oscarLogo from "@/assets/carriers/oscar.png";
import uhcLogo from "@/assets/carriers/uhc.png";

/**
 * Brand domain for every issuer that appears in the Marketplace and Medicare
 * carrier feeds. Ordered most specific first: state Blues resolve to their own
 * brand before the national Blue Cross fallback.
 */
const CARRIER_DOMAIN_RULES: Array<{ test: RegExp; domain: string }> = [
  // Blues, state by state
  { test: /premera/i, domain: "premera.com" },
  { test: /arkansas\s*blue/i, domain: "arkansasbluecross.com" },
  { test: /blue\s*cross.*alabama|bcbs\s*of\s*alabama/i, domain: "bcbsal.org" },
  { test: /blue\s*cross.*arizona|azblue/i, domain: "azblue.com" },
  { test: /blue\s*(cross|care).*michigan|bcbsm/i, domain: "bcbsm.com" },
  { test: /blue\s*cross.*north\s*dakota/i, domain: "bcbsnd.com" },
  { test: /blue\s*cross.*wyoming/i, domain: "bcbswy.com" },
  { test: /blue\s*cross.*kansas\s*city/i, domain: "bluekc.com" },
  { test: /blue\s*cross.*kansas/i, domain: "bcbsks.com" },
  { test: /blue\s*cross.*louisiana|hmo\s*louisiana/i, domain: "bcbsla.com" },
  { test: /blue\s*cross.*montana/i, domain: "bcbsmt.com" },
  { test: /blue\s*cross.*(nc|north\s*carolina)/i, domain: "bluecrossnc.com" },
  { test: /blue\s*cross.*nebraska/i, domain: "nebraskablue.com" },
  { test: /blue\s*cross.*oklahoma/i, domain: "bcbsok.com" },
  { test: /blue\s*cross.*texas/i, domain: "bcbstx.com" },
  { test: /blue\s*(cross|shield).*south\s*carolina/i, domain: "southcarolinablues.com" },
  { test: /blue\s*(cross|shield).*tennessee/i, domain: "bcbst.com" },
  { test: /blue\s*cross.*illinois/i, domain: "bcbsil.com" },
  { test: /blue\s*cross.*new\s*mexico/i, domain: "bcbsnm.com" },
  { test: /florida\s*blue/i, domain: "floridablue.com" },
  { test: /highmark/i, domain: "highmark.com" },
  { test: /wellmark/i, domain: "wellmark.com" },
  { test: /regence|bridgespan/i, domain: "regence.com" },
  { test: /carefirst/i, domain: "carefirst.com" },
  { test: /anthem/i, domain: "anthem.com" },
  { test: /excellus/i, domain: "excellusbcbs.com" },
  { test: /independence\s*blue/i, domain: "ibx.com" },
  { test: /horizon\s*blue/i, domain: "horizonblue.com" },
  { test: /capital\s*blue/i, domain: "capbluecross.com" },

  // National and multi-state carriers
  { test: /ambetter/i, domain: "ambetterhealth.com" },
  { test: /amerihealth/i, domain: "amerihealthcaritas.com" },
  { test: /unitedhealth|united\s*health|\buhc\b/i, domain: "uhc.com" },
  { test: /cigna/i, domain: "cigna.com" },
  { test: /aetna/i, domain: "aetna.com" },
  { test: /humana/i, domain: "humana.com" },
  { test: /kaiser/i, domain: "kp.org" },
  { test: /molina/i, domain: "molinahealthcare.com" },
  { test: /oscar/i, domain: "hioscar.com" },
  { test: /caresource/i, domain: "caresource.com" },
  { test: /centene/i, domain: "centene.com" },
  { test: /wellcare/i, domain: "wellcare.com" },
  { test: /wellpoint/i, domain: "wellpoint.com" },
  { test: /wellsense/i, domain: "wellsense.org" },
  { test: /elevance/i, domain: "elevancehealth.com" },
  { test: /devoted/i, domain: "devoted.com" },
  { test: /clover/i, domain: "cloverhealth.com" },
  { test: /emblem/i, domain: "emblemhealth.com" },
  { test: /harvard\s*pilgrim/i, domain: "harvardpilgrim.org" },
  { test: /healthpartners/i, domain: "healthpartners.com" },
  { test: /medmutual|medical\s*mutual/i, domain: "medmutual.com" },
  { test: /medica/i, domain: "medica.com" },
  { test: /moda/i, domain: "modahealth.com" },
  { test: /pacificsource/i, domain: "pacificsource.com" },
  { test: /priority\s*health/i, domain: "priorityhealth.com" },
  { test: /providence/i, domain: "providencehealthplan.com" },
  { test: /quartz/i, domain: "quartzbenefits.com" },
  { test: /sanford/i, domain: "sanfordhealthplan.com" },
  { test: /select\s*health/i, domain: "selecthealth.org" },
  { test: /first\s*choice\s*next/i, domain: "selecthealthofsc.com" },
  { test: /geisinger/i, domain: "geisinger.org" },
  { test: /upmc/i, domain: "upmchealthplan.com" },
  { test: /sentara|optima/i, domain: "sentarahealthplans.com" },
  { test: /presbyterian/i, domain: "phs.org" },
  { test: /banner/i, domain: "bannerhealth.com" },
  { test: /ascension|us\s*health\s*and\s*life/i, domain: "ascension.org" },
  { test: /bright\s*health/i, domain: "brighthealthplan.com" },
  { test: /friday\s*health/i, domain: "fridayhealthplans.com" },

  // Regional and provider-sponsored plans
  { test: /alliant/i, domain: "alliantplans.com" },
  { test: /antidote/i, domain: "antidotehealth.com" },
  { test: /aspirus/i, domain: "aspirushealthplan.com" },
  { test: /avmed/i, domain: "avmed.org" },
  { test: /avera/i, domain: "averahealthplans.com" },
  { test: /baylor\s*scott/i, domain: "bswhealthplan.com" },
  { test: /christus/i, domain: "christushealthplan.org" },
  { test: /capital\s*health\s*plan/i, domain: "capitalhealth.com" },
  { test: /community\s*first/i, domain: "communityfirsthealthplans.com" },
  { test: /community\s*health\s*choice/i, domain: "communityhealthchoice.org" },
  { test: /communitycare/i, domain: "ccok.com" },
  { test: /cox\s*health/i, domain: "coxhealthplans.com" },
  { test: /dean\s*health/i, domain: "deancare.com" },
  { test: /florida\s*health\s*care/i, domain: "fhcp.com" },
  { test: /group\s*health\s*cooperative/i, domain: "ghcscw.com" },
  { test: /hmsa/i, domain: "hmsa.com" },
  { test: /harbor\s*health/i, domain: "harborhealth.com" },
  { test: /health\s*advantage/i, domain: "healthadvantage-hmo.com" },
  { test: /health\s*first/i, domain: "hf.org" },
  { test: /imperial/i, domain: "imperialhealthplan.com" },
  { test: /instil/i, domain: "instilhealth.com" },
  { test: /mclaren/i, domain: "mclarenhealthplan.org" },
  { test: /mending/i, domain: "mending.health" },
  { test: /mercycare/i, domain: "mercycarehealthplans.com" },
  { test: /mountain\s*health/i, domain: "mountainhealth.coop" },
  { test: /network\s*health/i, domain: "networkhealth.com" },
  { test: /octave/i, domain: "octave.health" },
  { test: /paramount/i, domain: "paramounthealthcare.com" },
  { test: /security\s*health/i, domain: "securityhealth.org" },
  { test: /sendero/i, domain: "senderohealth.com" },
  { test: /summacare/i, domain: "summacare.com" },
  { test: /university\s*of\s*utah/i, domain: "uofuhealth.org" },
  { test: /^22\s*health/i, domain: "22.health" },

  // National Blue Cross fallback for any remaining Blues plan
  { test: /blue\s*cross|blue\s*shield|bcbs/i, domain: "bcbs.com" },
];

/** Bundled marks used when Logo.dev is unavailable. */
const CARRIER_LOGO_RULES: Array<{ test: RegExp; logo: string }> = [
  { test: /blue\s*cross|blue\s*shield|bcbs|florida\s*blue|highmark|wellmark|regence/i, logo: bcbsLogo },
  { test: /aetna/i, logo: aetnaLogo },
  { test: /cigna/i, logo: cignaLogo },
  { test: /united\s*health|uhc/i, logo: uhcLogo },
  { test: /ambetter/i, logo: ambetterLogo },
  { test: /molina/i, logo: molinaLogo },
  { test: /oscar/i, logo: oscarLogo },
];

const LOGO_DEV_TOKEN = import.meta.env.VITE_LOVABLE_CONNECTOR_LOGO_DEV_API_KEY as string | undefined;

/** Builds a Logo.dev image URL for a carrier domain, when the connector key is configured. */
export function logoDevUrl(domain: string, size = 128): string | null {
  if (!LOGO_DEV_TOKEN) return null;
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=${size}&format=png&retina=true`;
}

/** Resolves the brand domain for a carrier name, if we know it. */
export function carrierDomain(carrierName?: string | null): string | null {
  if (!carrierName) return null;
  return CARRIER_DOMAIN_RULES.find(rule => rule.test.test(carrierName))?.domain ?? null;
}

export function resolveCarrierLogo(
  carrierName?: string | null,
  dbLogoUrl?: string | null,
): string | null {
  if (dbLogoUrl) return dbLogoUrl;
  if (!carrierName) return null;

  const domain = carrierDomain(carrierName);
  const remote = domain ? logoDevUrl(domain) : null;
  if (remote) return remote;

  return CARRIER_LOGO_RULES.find(rule => rule.test.test(carrierName))?.logo ?? null;
}

/** Bundled fallback mark, used when the remote logo request fails. */
export function fallbackCarrierLogo(carrierName?: string | null): string | null {
  if (!carrierName) return null;
  return CARRIER_LOGO_RULES.find(rule => rule.test.test(carrierName))?.logo ?? null;
}
