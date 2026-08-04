import Header from "@/components/Header";
import Hero from "@/components/Hero";
import TrustStrip from "@/components/TrustStrip";
import CarrierLogos from "@/components/CarrierLogos";
import CoverageCategories from "@/components/CoverageCategories";
import SmartTools from "@/components/SmartTools";
import FeatureShowcase from "@/components/FeatureShowcase";
import HowItWorks from "@/components/HowItWorks";
import WhyChooseUs from "@/components/WhyChooseUs";
import LicensedSupport from "@/components/LicensedSupport";
import CTABanner from "@/components/CTABanner";
import About from "@/components/About";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <TrustStrip />
        <CarrierLogos />
        <CoverageCategories />
        <SmartTools />
        <FeatureShowcase />
        <HowItWorks />
        <WhyChooseUs />
        <LicensedSupport />
        <About />
        <Testimonials />
        <FAQ />
        <CTABanner />
        <Contact />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
