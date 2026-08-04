import { cn } from "@/lib/utils";
import { Reveal } from "@/components/premium/Reveal";
import bcbsLogo from "@/assets/carriers/bcbs.png";
import aetnaLogo from "@/assets/carriers/aetna.png";
import cignaLogo from "@/assets/carriers/cigna.png";
import uhcLogo from "@/assets/carriers/uhc.png";
import ambetterLogo from "@/assets/carriers/ambetter.png";
import molinaLogo from "@/assets/carriers/molina.png";
import oscarLogo from "@/assets/carriers/oscar.png";
import ameritasLogo from "@/assets/carriers/ameritas.png";

/** `compact` marks logos that are near square, so they get a smaller cap height
 *  and stay optically the same size as the wide wordmarks. */
const carriers = [
  { name: "Blue Cross Blue Shield", logo: bcbsLogo },
  { name: "Aetna", logo: aetnaLogo },
  { name: "Cigna", logo: cignaLogo, compact: true },
  { name: "UnitedHealthcare", logo: uhcLogo },
  { name: "Ambetter", logo: ambetterLogo, compact: true },
  { name: "Molina Healthcare", logo: molinaLogo },
  { name: "Oscar Health", logo: oscarLogo },
  { name: "Ameritas", logo: ameritasLogo, compact: true },
];

const CarrierLogos = () => {
  const all = [...carriers, ...carriers];

  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      <Reveal y={10}>
        <p className="eyebrow relative z-10 mb-8 text-center text-muted-foreground">
          Plans from carriers you already know
        </p>
      </Reveal>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
        <div className="flex w-max animate-[scroll_46s_linear_infinite] items-center gap-12 px-6 sm:gap-16">
          {all.map((carrier, i) => (
            <div
              key={`${carrier.name}-${i}`}
              className="flex h-12 w-[124px] shrink-0 items-center justify-center sm:w-[148px]"
            >
              <img
                src={carrier.logo}
                alt={carrier.name}
                loading="lazy"
                className={cn(
                  "w-auto max-w-full object-contain opacity-45 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0",
                  carrier.compact ? "max-h-8 sm:max-h-9" : "max-h-10 sm:max-h-11",
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CarrierLogos;
