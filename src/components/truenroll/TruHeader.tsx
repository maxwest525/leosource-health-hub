import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { TruLogo } from "./TruLogo";

const NAV = [
  { label: "Resource Center", to: "/resources" },
  { label: "Plan Match", to: "/compare-plans" },
  { label: "Medicare", to: "/medicare" },
  { label: "Plan Lookup", to: "/plan-lookup" },
  { label: "Trudy AI", to: "/ai-quote" },
  { label: "Support", to: "/contact" },
];

export const TruHeader = () => (
  <header className="sticky top-0 z-50 border-b border-[#E3EDF5] bg-white/90 backdrop-blur-md">
    <div className="mx-auto flex h-[72px] max-w-[1240px] items-center gap-8 px-5">
      <Link to="/home-v2" aria-label="TruEnroll home">
        <TruLogo />
      </Link>

      <nav className="hidden items-center gap-7 lg:flex">
        {NAV.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="whitespace-nowrap text-[14.5px] font-semibold text-[#1B3D5C] transition-colors hover:text-[#1877D2]"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <Link
          to="/get-started"
          className="rounded-[10px] bg-[#EF4B3C] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(239,75,60,0.9)] transition-colors hover:bg-[#df3f30]"
        >
          Get Started
        </Link>
        <button type="button" aria-label="Open menu" className="text-[#41607A] lg:hidden">
          <Menu className="h-6 w-6" />
        </button>
      </div>
    </div>
  </header>
);
