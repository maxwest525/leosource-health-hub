import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, ShieldCheck } from "lucide-react";
import { TruLogo } from "./TruLogo";

const COLUMNS = [
  {
    heading: "Explore",
    links: [
      { label: "Resource Center", to: "/resources" },
      { label: "Plan Match", to: "/compare-plans" },
      { label: "Medicare", to: "/medicare" },
      { label: "Plan Lookup", to: "/plan-lookup" },
      { label: "Trudy AI", to: "/ai-quote" },
    ],
  },
  {
    heading: "Tools",
    links: [
      { label: "Doctors", to: "/provider-search" },
      { label: "Prescriptions", to: "/find-prescriptions" },
      { label: "Subsidies", to: "/subsidy-calculator" },
      { label: "Enrollment Help", to: "/get-started" },
      { label: "Coverage Basics", to: "/resources" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Support", to: "/contact" },
      { label: "FAQ", to: "/resources" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", to: "/contact" },
      { label: "Terms", to: "/contact" },
      { label: "Accessibility", to: "/contact" },
      { label: "API Data Sources", to: "/carriers" },
    ],
  },
];

const SOCIALS = [Facebook, Twitter, Instagram, Linkedin];

export const TruFooter = () => (
  <footer className="border-t border-[#E3EDF5] bg-[#F7FBFD]">
    <div className="mx-auto max-w-[1240px] px-5 py-14">
      <div className="grid gap-10 lg:grid-cols-[1.2fr_repeat(4,0.8fr)_1.2fr]">
        <div>
          <TruLogo />
          <p className="mt-4 max-w-[280px] text-[13.5px] leading-relaxed text-[#5C7A91]">
            We help consumers understand and enroll in health coverage, with confidence and without
            sales pressure.
          </p>
          <div className="mt-5 flex gap-3">
            {SOCIALS.map((Icon, index) => (
              <Link
                key={index}
                to="/contact"
                aria-label="TruEnroll social profile"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B3D5C] text-white transition-colors hover:bg-[#1877D2]"
              >
                <Icon className="h-[15px] w-[15px]" />
              </Link>
            ))}
          </div>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.heading}>
            <p className="text-[14px] font-bold text-[#0F2B46]">{column.heading}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-[13.5px] text-[#5C7A91] transition-colors hover:text-[#1877D2]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="flex items-start gap-3 self-start rounded-[16px] border border-[#E1EEF8] bg-white px-5 py-5 shadow-[0_14px_36px_-30px_rgba(15,43,70,0.5)]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#17A2A2]">
            <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.2} />
          </span>
          <p className="text-[12.5px] leading-relaxed text-[#5C7A91]">
            <span className="font-bold text-[#0F2B46]">Powered by direct CMS + HealthSherpa APIs</span>{" "}
            for accurate, up-to-date plan information.
          </p>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-4 border-t border-[#E3EDF5] pt-6 text-[12.5px] text-[#7C97AC] lg:flex-row lg:items-center lg:justify-between">
        <p>&copy; {new Date().getFullYear()} TruEnroll. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-5">
          <Link to="/contact" className="hover:text-[#1877D2]">Privacy Policy</Link>
          <Link to="/contact" className="hover:text-[#1877D2]">Terms</Link>
          <Link to="/contact" className="hover:text-[#1877D2]">Accessibility</Link>
          <Link to="/contact" className="hover:text-[#1877D2]">Sitemap</Link>
        </div>
        <p className="lg:text-right">
          This site is for informational purposes only and is not affiliated with any government agency.
        </p>
      </div>
    </div>
  </footer>
);
