import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  MessageCircle,
  ShieldCheck,
  Compass,
  BookHeart,
  Users,
  Target,
  Crosshair,
} from "lucide-react";
import { TruChatPanel } from "./TruChatPanel";
import heroPath from "@/assets/truenroll/hero-path.jpg";

type Chip = { icon?: LucideIcon; glyph?: string; tint: string; label: string };

const CHIPS: Chip[] = [
  { icon: Compass, tint: "text-[#1877D2]", label: "ACA" },
  { icon: BookHeart, tint: "text-[#22B573]", label: "Medicare" },
  { icon: Users, tint: "text-[#7C5CD6]", label: "Doctors" },
  { glyph: "Rx", tint: "text-[#EF4B3C]", label: "Prescriptions" },
  { icon: Target, tint: "text-[#17A25E]", label: "Subsidies" },
  { icon: Crosshair, tint: "text-[#5B6BE0]", label: "Plan Match" },
];


export const TruHero = () => (
  <section className="relative overflow-hidden bg-white">
    {/* Illustrated band: sits behind the chat card and runs to the right edge */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 hidden w-[20%] bg-cover bg-center lg:block"
      style={{ backgroundImage: `url(${heroPath})` }}
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-[8%] hidden w-[14%] bg-gradient-to-r from-white via-white to-transparent lg:block"
    />

    <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-5 py-14 lg:grid-cols-[1.3fr_0.9fr] lg:py-16">
      <div>
        <p className="text-[13px] font-bold uppercase tracking-[0.13em] text-[#1877D2]">
          Self-enrollment made simple
        </p>

        <h1 className="mt-4 text-[34px] font-bold leading-[1.12] tracking-[-0.03em] text-[#0B2545] sm:text-[40px] lg:whitespace-nowrap lg:text-[42px] xl:text-[46px]">
          Understand your coverage.
          <br />
          Enroll on your own terms.
        </h1>

        <p className="mt-5 max-w-[470px] text-[16px] leading-[1.65] text-[#6B8497]">
          TruEnroll is a consumer resource center that helps you compare and understand health
          coverage, so you can enroll with confidence, without the hassle of sales calls.
        </p>

        <p className="mt-6 flex max-w-[420px] items-start gap-3 text-[14px] font-medium leading-[1.5] text-[#1B3D5C]">
          <ShieldCheck className="mt-[1px] h-[21px] w-[21px] shrink-0 text-[#17A2A2]" strokeWidth={1.9} />
          Powered by direct CMS + HealthSherpa APIs for accurate, up-to-date plan information.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Link
            to="/compare-plans"
            className="inline-flex items-center gap-3 rounded-[8px] bg-[#F04A20] px-7 py-3.5 text-[15.5px] font-semibold text-white shadow-[0_12px_26px_-16px_rgba(240,74,32,0.9)] transition-colors hover:bg-[#dc4019]"
          >
            Get Started
            <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </Link>
          <Link
            to="/ai-quote"
            className="inline-flex items-center gap-3 rounded-[8px] border-[1.5px] border-[#2E7FE0] bg-white px-7 py-3.5 text-[15.5px] font-semibold text-[#1877D2] transition-colors hover:bg-[#F0F7FE]"
          >
            Talk to Trudy
            <MessageCircle className="h-[18px] w-[18px]" strokeWidth={2} />
          </Link>
        </div>

        <ul className="mt-8 flex flex-wrap gap-2.5 ">
          {CHIPS.map(({ icon: Icon, glyph, tint, label }) => (
            <li
              key={label}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#DCE7F0] bg-white px-3.5 py-2 text-[13px] font-medium text-[#1B3D5C]"
            >
              {Icon ? (
                <Icon className={`h-[17px] w-[17px] shrink-0 ${tint}`} strokeWidth={2} />
              ) : (
                <span className={`shrink-0 text-[14px] font-bold leading-none ${tint}`}>{glyph}</span>
              )}
              {label}
            </li>
          ))}
        </ul>

      </div>

      <div className="lg:mr-[6%] xl:mr-[9%]">
        <TruChatPanel />
      </div>
    </div>
  </section>
);
