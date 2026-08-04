import { useEffect } from "react";
import { TruHeader } from "@/components/truenroll/TruHeader";
import { TruHero } from "@/components/truenroll/TruHero";
import { TruCenters, TruSpotlights, TruTrustBar } from "@/components/truenroll/TruSections";
import { TruTrudyStrip } from "@/components/truenroll/TruTrudyStrip";
import { TruFooter } from "@/components/truenroll/TruFooter";

const HomeV2 = () => {
  useEffect(() => {
    document.title = "TruEnroll | Understand your coverage, enroll on your terms";
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <TruHeader />
      <main>
        <TruHero />
        <TruCenters />
        <TruTrudyStrip />
        <TruSpotlights />
        <TruTrustBar />


      </main>
      <TruFooter />
    </div>
  );
};

export default HomeV2;
