import { Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { TruLogo } from "@/components/truenroll/TruLogo";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="band-ink py-12 sm:py-16 border-t border-border/40 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/[0.03] blur-[100px]" />
      </div>

      <div className="section-container relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <TruLogo tone="light" size={26} />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              A licensed health insurance agency helping individuals, families, and Medicare consumers find coverage they can understand.
            </p>
            <div className="space-y-1.5">
              <a href="tel:+18007581590" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="w-3.5 h-3.5" /> 800.758.1590
              </a>
              <a href="mailto:info@truenroll.com" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-3.5 h-3.5" /> info@truenroll.com
              </a>
            </div>
          </div>

          {/* Coverage */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Coverage</p>
            <ul className="space-y-2">
              <li><Link to="/individual-family" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Individual & Family</Link></li>
              <li><Link to="/medicare" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Medicare Solutions</Link></li>
              <li><Link to="/dental-vision" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dental & Vision</Link></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Supplemental</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Company</p>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link to="/resources" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Resources & FAQ</Link></li>
              <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact & Support</Link></li>
              <li><Link to="/get-started" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Get Started</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Legal</p>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Licensing</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Disclosures</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {currentYear} TruEnroll. All rights reserved. NPN #000000
          </p>
          <p className="text-xs text-muted-foreground/60">
            Licensed health insurance agency · All 50 States
          </p>
        </div>

        <p className="text-[10px] text-muted-foreground/40 mt-4 max-w-5xl leading-relaxed">
          TruEnroll is a licensed health insurance agency. We do not provide tax, legal, or financial advice. Coverage availability, plan options, and premiums vary by state and are subject to change. TruEnroll is not affiliated with, endorsed by, or connected to any government agency, Medicare, or the federal Health Insurance Marketplace. All carrier names and trademarks referenced are the property of their respective owners. By using this website you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
