import { Link } from "react-router-dom";
import { ShieldCheck, Facebook, Linkedin, Instagram, Youtube } from "lucide-react";

const COLUMNS = [
  {
    heading: "Coverage",
    links: [
      { label: "Individual and family", to: "/individual-family" },
      { label: "Medicare", to: "/medicare" },
      { label: "Dental and vision", to: "/dental-vision" },
      { label: "Compare plans", to: "/compare-plans" },
    ],
  },
  {
    heading: "Tools",
    links: [
      { label: "Plan lookup", to: "/plan-lookup" },
      { label: "Subsidy calculator", to: "/subsidy-calculator" },
      { label: "Doctor search", to: "/provider-search" },
      { label: "Prescription check", to: "/find-prescriptions" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "Resource center", to: "/resources" },
      { label: "Carrier directory", to: "/carriers" },
      { label: "Ask Trudy", to: "/ai-quote" },
      { label: "All tools", to: "/tools" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About us", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Get started", to: "/get-started" },
      { label: "Agent login", to: "/agent-login" },
    ],
  },
];

const SOCIALS = [Facebook, Linkedin, Instagram, Youtube];

export const TruFooter = () => (
  <footer className="border-t border-[#E3EDF5] bg-[#F7FBFD]">
    <div className="mx-auto max-w-[1200px] px-5 py-14">
      <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#1877D2]">
              <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.2} />
            </span>
            <span className="text-[20px] font-bold tracking-tight text-[#0F2B46]">
              Tru<span className="text-[#1877D2]">Enroll</span>
            </span>
          </div>
          <p className="mt-4 max-w-[300px] text-[14px] leading-relaxed text-[#5C7A91]">
            An independent agency helping people understand health coverage and enroll without pressure.
          </p>
          <div className="mt-5 flex gap-4">
            {SOCIALS.map((Icon, index) => (
              <a
                key={index}
                href="/contact"
                aria-label="TruEnroll social profile"
                className="text-[#8AA4B8] transition-colors hover:text-[#1877D2]"
              >
                <Icon className="h-[18px] w-[18px]" />
              </a>
            ))}
          </div>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.heading}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0F2B46]">
              {column.heading}
            </p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-[14px] text-[#5C7A91] transition-colors hover:text-[#1877D2]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-col gap-4 border-t border-[#E3EDF5] pt-6 text-[13px] text-[#7C97AC] sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} TruEnroll. All rights reserved.</p>
        <p className="max-w-[620px] sm:text-right">
          Not connected with or endorsed by the United States government or the federal Medicare program.
        </p>
      </div>
    </div>
  </footer>
);
