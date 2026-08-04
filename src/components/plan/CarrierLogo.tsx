import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { fallbackCarrierLogo, resolveCarrierLogo } from "@/lib/carrier-logos";

type CarrierLogoProps = {
  /** Insurance carrier / issuer name as returned by the marketplace API. */
  name?: string | null;
  /** Optional logo URL supplied directly by the data source. */
  logoUrl?: string | null;
  className?: string;
};

/** Square carrier mark with a bundled mark, then a neutral shield, as fallbacks. */
export const CarrierLogo = ({ name, logoUrl, className }: CarrierLogoProps) => {
  const primary = resolveCarrierLogo(name, logoUrl);
  const [src, setSrc] = useState(primary);

  useEffect(() => setSrc(primary), [primary]);

  const handleError = () => {
    const bundled = fallbackCarrierLogo(name);
    setSrc(bundled && bundled !== src ? bundled : null);
  };

  return (
    <div
      className={cn(
        "shrink-0 w-11 h-11 rounded-xl bg-primary/[0.05] flex items-center justify-center overflow-hidden",
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={name ? `${name} logo` : "Carrier logo"}
          loading="lazy"
          decoding="async"
          onError={handleError}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <ShieldCheck className="w-5 h-5 text-primary/60" strokeWidth={1.5} aria-hidden />
      )}
    </div>
  );
};
