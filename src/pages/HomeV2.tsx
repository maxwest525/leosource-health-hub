import { useEffect } from "react";
import { TruHeader } from "@/components/truenroll/TruHeader";
import { TruHero } from "@/components/truenroll/TruHero";
import { TruCenters, TruSpotlights } from "@/components/truenroll/TruSections";
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
        <TruSpotlights />
      </main>
      <TruFooter />
    </div>
  );
};

export default HomeV2;
