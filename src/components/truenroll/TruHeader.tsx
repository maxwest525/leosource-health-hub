import { Link } from "react-router-dom";
import { ShieldCheck, Menu } from "lucide-react";

const NAV = [
  { label: "Plans", to: "/compare-plans" },
  { label: "Medicare", to: "/medicare" },
  { label: "Resources", to: "/resources" },
  { label: "Tools", to: "/tools" },
  { label: "About", to: "/about" },
];

export const TruHeader = () => (
  <header className="sticky top-0 z-50 border-b border-[#E3EDF5] bg-white/90 backdrop-blur-md">
    <div className="mx-auto flex h-[72px] max-w-[1200px] items-center gap-8 px-5">
      <Link to="/home-v2" className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#1877D2]">
          <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.2} />
        </span>
        <span className="text-[20px] font-bold tracking-tight text-[#0F2B46]">
          Tru<span className="text-[#1877D2]">Enroll</span>
        </span>
      </Link>

      <nav className="hidden items-center gap-7 md:flex">
        {NAV.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="text-[15px] font-medium text-[#41607A] transition-colors hover:text-[#1877D2]"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <Link
          to="/plan-lookup"
          className="hidden rounded-full border border-[#BFD9F0] px-5 py-2.5 text-[14px] font-semibold text-[#1877D2] transition-colors hover:bg-[#F0F7FE] sm:inline-flex"
        >
          Explore plans
        </Link>
        <Link
          to="/get-started"
          className="rounded-full bg-[#EF4B3C] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(239,75,60,0.7)] transition-colors hover:bg-[#df3f30]"
        >
          Start free
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          className="text-[#41607A] md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
    </div>
  </header>
);
