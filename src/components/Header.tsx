import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, ChevronDown, ChevronRight } from "lucide-react";
import { TruLogo } from "@/components/truenroll/TruLogo";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import QuoteFormDialog from "@/components/QuoteFormDialog";
import SpecialistCard from "@/components/SpecialistCard";
import {
  Compass,
  Calculator,
  Stethoscope,
  Pill,
  FileSearch,
  Building2,
  Scale,

  HeartPulse,
  Users,
  Smile,
  LifeBuoy,
  BookOpen,
  Mail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon; blurb?: string };

const coverageLinks: NavItem[] = [
  { label: "Individual & family", href: "/individual-family", icon: Users, blurb: "ACA Marketplace plans with your subsidy applied" },
  { label: "Medicare", href: "/mapd-supplement", icon: HeartPulse, blurb: "Advantage, supplement, and Part D guidance" },
  { label: "Dental & vision", href: "/dental-vision", icon: Smile, blurb: "Standalone coverage that fills the gaps" },
];

const guidedTools: NavItem[] = [
  { label: "Guided plan wizard", href: "/wizard", icon: Compass, blurb: "Price every plan in your county in two minutes" },
  { label: "Find my MAPD / supplement", href: "/find-mapd", icon: HeartPulse, blurb: "Medicare Advantage and Medigap side by side" },
  { label: "Savings estimator", href: "/subsidy-calculator", icon: Calculator, blurb: "Tax credit, CSR level, and Medicaid check" },
  { label: "Start a consultation", href: "/get-started", icon: LifeBuoy, blurb: "Secure intake so a specialist can pick up where you left off" },
];

const lookupTools: NavItem[] = [
  { label: "Find my doctor", href: "/provider-search", icon: Stethoscope, blurb: "Live in-network status by plan" },
  { label: "Find my prescriptions", href: "/find-prescriptions", icon: Pill, blurb: "Formulary coverage and tier by plan" },
  { label: "Compare plans side by side", href: "/compare-plans", icon: Scale, blurb: "Live 2026 premiums, deductibles, and star ratings" },
  { label: "Plan lookup by ID", href: "/plan-lookup", icon: FileSearch, blurb: "Official benefits and plan documents" },
  { label: "Carrier directory", href: "/carriers", icon: Building2, blurb: "Every insurer licensed in your state" },
];

const companyLinks: NavItem[] = [
  { label: "All tools & lookups", href: "/tools", icon: Compass },
  { label: "Resources", href: "/resources", icon: BookOpen },
  { label: "About us", href: "/about", icon: LifeBuoy },
  { label: "Contact & support", href: "/contact", icon: Mail },
];


const MenuCard = ({ item }: { item: NavItem }) => (
  <Link
    to={item.href}
    className="group/item flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-foreground/[0.04] transition-colors"
  >
    <item.icon className="w-4 h-4 mt-0.5 text-primary shrink-0" strokeWidth={1.5} />
    <span className="block">
      <span className="block text-[13px] font-semibold text-foreground group-hover/item:text-primary transition-colors">
        {item.label}
      </span>
      {item.blurb && <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">{item.blurb}</span>}
    </span>
  </Link>
);

const NavTrigger = ({ label }: { label: string }) => (
  <button className="flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] font-medium px-3 py-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200">
    {label} <ChevronDown className="w-3 h-3 opacity-60" />
  </button>
);

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* Utility bar */}
        <div className="band-ink text-white/60 border-b border-white/10">
          <div className="section-container flex justify-between items-center py-2 text-[11px]">
            <div className="flex items-center gap-6">
              <a href="tel:+18007581590" className="hover:text-white transition-colors font-medium">
                800.758.1590
              </a>
              <span className="hidden sm:inline text-white/35">
                Mon–Fri 9AM–6PM ET
              </span>
              <span className="hidden md:inline text-white/35">
                Hablamos Español
              </span>
            </div>
            <div className="flex items-center gap-5 text-white/30">
              <Link to="/agent-login" className="hover:text-white transition-colors font-medium text-white/50">
                Agent Portal
              </Link>
            </div>

          </div>
        </div>

        {/* Main nav */}
        <nav className={cn(
          "backdrop-blur-2xl border-b transition-all duration-300",
          "band-ink",
          scrolled ? "shadow-md" : ""
        )}>
          <div className="section-container">
            <div className="flex items-center justify-between h-16 gap-4">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 group shrink-0">
                <span className="transition-transform duration-300 group-hover:scale-105"><TruLogo tone="light" /></span>
              </Link>

              {/* Desktop Nav */}
              <div className="hidden lg:flex items-center gap-1">
                <Link to="/" className="text-[11px] uppercase tracking-[0.12em] font-medium px-3 py-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200">
                  Home
                </Link>




                {/* Coverage */}
                <div className="relative group">
                  <NavTrigger label="Coverage" />
                  <div className="absolute top-full left-0 pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="bg-card border border-border/60 rounded-xl shadow-2xl p-2 w-[320px]">
                      {coverageLinks.map((link) => (
                        <MenuCard key={link.href} item={link} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tools & lookups mega menu */}
                <div className="relative group">
                  <NavTrigger label="Tools & lookups" />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="bg-card border border-border/60 rounded-xl shadow-2xl p-4 w-[680px]">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold px-3 pb-1">
                            Guided shopping
                          </p>
                          {guidedTools.map((link) => (
                            <MenuCard key={link.href} item={link} />
                          ))}
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold px-3 pb-1">
                            Live data lookups
                          </p>
                          {lookupTools.map((link) => (
                            <MenuCard key={link.href} item={link} />
                          ))}
                        </div>
                      </div>
                      <div className="h-px bg-border/40 my-3" />
                      <div className="flex items-center justify-between px-3">
                        <p className="text-[11px] text-muted-foreground">
                          Powered by live 2026 CMS Marketplace data. No account required.
                        </p>
                        <Link to="/tools" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:gap-2.5 transition-all">
                          All coverage tools <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company */}
                <div className="relative group">
                  <NavTrigger label="Company" />
                  <div className="absolute top-full right-0 pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="bg-card border border-border/60 rounded-xl shadow-2xl p-2 w-[240px]">
                      {companyLinks.map((link) => (
                        <MenuCard key={link.href} item={link} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right actions */}
              <div className="hidden lg:flex items-center gap-2.5 shrink-0">
                <Link to="/wizard" className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] font-semibold h-9 px-3 rounded-md text-white border border-white/25 hover:border-accent hover:text-accent transition-all duration-200">
                  <Compass className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Compare plans
                </Link>
                <Button

                  size="sm"
                  className="text-[11px] uppercase tracking-[0.1em] font-semibold h-9 rounded-md bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => setQuoteOpen(true)}
                >
                  Get Started
                </Button>
                <SpecialistCard compact />
              </div>

              {/* Mobile */}
              <div className="flex items-center gap-1.5 lg:hidden">
                <a href="tel:+18007581590" className="p-2 rounded-md text-white/80" aria-label="Call us">
                  <Phone className="w-4 h-4" strokeWidth={2} />
                </a>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-md text-white/80 hover:bg-white/10 transition-all duration-300"
                  aria-label="Toggle navigation"
                >
                  {isMenuOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
              <div className="lg:hidden py-3 border-t border-white/10 animate-fade-in max-h-[70vh] overflow-y-auto">
                <div className="flex flex-col gap-1">
                  <Link
                    to="/wizard"
                    className="flex items-center justify-between px-3 py-3 rounded-md text-[12px] font-semibold text-white border border-white/25 hover:border-accent hover:text-accent transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Compass className="w-4 h-4 text-accent" strokeWidth={1.5} />
                      Compare plans
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </Link>

                  {[
                    { title: "Coverage", items: coverageLinks },
                    { title: "Guided shopping", items: guidedTools },
                    { title: "Live data lookups", items: lookupTools },
                    { title: "Company", items: companyLinks },
                  ].map((group) => (
                    <div key={group.title}>
                      <p className="text-[10px] text-white/40 font-semibold tracking-widest uppercase px-3 pb-1 pt-3">
                        {group.title}
                      </p>
                      {group.items.map((link) => (
                        <Link
                          key={link.href}
                          to={link.href}
                          className="flex items-center justify-between px-3 py-2.5 rounded-md text-[12px] font-medium text-white/75 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <span className="flex items-center gap-2.5">
                            <link.icon className="w-4 h-4 text-accent" strokeWidth={1.5} />
                            {link.label}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                        </Link>
                      ))}
                    </div>
                  ))}
                  <Link
                    to="/tools"
                    className="mt-2 flex items-center justify-between px-3 py-2.5 rounded-md text-[12px] font-semibold text-accent hover:bg-white/10 transition-colors"
                  >
                    All coverage tools <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <div className="pt-4 space-y-2 px-1">
                    <Button className="w-full bg-accent text-accent-foreground h-11 font-semibold rounded-lg" onClick={() => setQuoteOpen(true)}>Get Started</Button>
                    <SpecialistCard className="w-full justify-center" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>
      <QuoteFormDialog open={quoteOpen} onOpenChange={setQuoteOpen} />
    </>
  );
};

export default Header;
