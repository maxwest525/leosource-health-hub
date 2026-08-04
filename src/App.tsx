import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { MotionConfig } from "framer-motion";

import { useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import AgentLogin from "./pages/AgentLogin";
import IndividualFamily from "./pages/IndividualFamily";
import Medicare from "./pages/Medicare";
import DentalVision from "./pages/DentalVision";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import Resources from "./pages/Resources";
import GetStarted from "./pages/GetStarted";
import NotFound from "./pages/NotFound";
import ProviderSearch from "./pages/ProviderSearch";
import FindPrescriptions from "./pages/FindPrescriptions";
import ComparePlans from "./pages/ComparePlans";
import FindMAPD from "./pages/FindMAPD";
import MapdSupplement from "./pages/MapdSupplement";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDataImport from "./pages/AdminDataImport";
import ToolsHub from "./pages/ToolsHub";
import SubsidyCalculator from "./pages/SubsidyCalculator";
import CarrierDirectory from "./pages/CarrierDirectory";
import PlanLookup from "./pages/PlanLookup";
import AiQuote from "./pages/AiQuote";

const queryClient = new QueryClient();

/** Header height reserved so smooth-scrolled anchors are not hidden behind the fixed nav. */
const HEADER_OFFSET = 88;

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // State-carrying hashes (e.g. #hero=leo) are not element anchors: leave scroll alone.
    const isElementAnchor = /^#[A-Za-z][\w-]*$/.test(hash);

    if (!hash || !isElementAnchor) {
      if (hash) return;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      return;
    }


    let frame = 0;
    let attempts = 0;

    // Anchor targets can mount a tick after the route does, so retry briefly.
    const scrollToAnchor = () => {
      const target = document.querySelector(hash);
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
        window.scrollTo({
          top: Math.max(top, 0),
          left: 0,
          behavior: prefersReducedMotion ? ("instant" as ScrollBehavior) : "smooth",
        });
        return;
      }
      if (attempts < 20) {
        attempts += 1;
        frame = window.requestAnimationFrame(scrollToAnchor);
      }
    };

    frame = window.requestAnimationFrame(scrollToAnchor);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}



const App = () => (
  <MotionConfig reducedMotion="user">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>

        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/individual-family" element={<IndividualFamily />} />
            <Route path="/medicare" element={<Medicare />} />
            <Route path="/dental-vision" element={<DentalVision />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/get-started" element={<GetStarted />} />
            <Route path="/provider-search" element={<ProviderSearch />} />
            <Route path="/find-prescriptions" element={<FindPrescriptions />} />
            <Route path="/compare-plans" element={<ComparePlans />} />
            <Route path="/wizard" element={<ComparePlans />} />
            <Route path="/ai-quote" element={<AiQuote />} />
            <Route path="/tools" element={<ToolsHub />} />
            <Route path="/subsidy-calculator" element={<SubsidyCalculator />} />
            <Route path="/carriers" element={<CarrierDirectory />} />
            <Route path="/plan-lookup" element={<PlanLookup />} />
            <Route path="/mapd-supplement" element={<MapdSupplement />} />
            <Route path="/find-mapd" element={<FindMAPD />} />
            <Route path="/agent-login" element={<AgentLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/import" element={<AdminDataImport />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </MotionConfig>
);


export default App;
