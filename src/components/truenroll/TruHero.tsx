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

    <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-5 py-14 lg:grid-cols-[1.1fr_0.98fr] lg:py-16">
      <div>
        <p className="text-[12.5px] font-bold uppercase tracking-[0.09em] text-[#1877D2]">
          Self-enrollment made simple
        </p>

        <h1 className="mt-4 text-[36px] font-bold leading-[1.14] tracking-[-0.028em] text-[#0F2B46] lg:text-[41px] xl:text-[45px]">
          Understand your coverage.
          <br />
          Enroll on your own terms.
        </h1>


        <p className="mt-5 max-w-[470px] text-[16px] leading-[1.7] text-[#5C7A91]">
          TruEnroll is a consumer resource center that helps you compare and understand health
          coverage, so you can enroll with confidence, without the hassle of sales calls.
        </p>

        <p className="mt-5 flex max-w-[430px] items-start gap-2.5 text-[14px] leading-[1.5] text-[#41607A]">
          <BadgeCheck className="mt-[1px] h-[18px] w-[18px] shrink-0 text-[#22B573]" strokeWidth={2} />
          Powered by direct CMS + HealthSherpa APIs for accurate, up-to-date plan information.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3.5">
          <Link
            to="/compare-plans"
            className="inline-flex items-center gap-2.5 rounded-[10px] bg-[#EF4B3C] px-6 py-3 text-[15px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(239,75,60,0.9)] transition-colors hover:bg-[#df3f30]"
          >
            Get Started
            <ArrowRight className="h-[17px] w-[17px]" />
          </Link>
          <Link
            to="/ai-quote"
            className="inline-flex items-center gap-2.5 rounded-[10px] border border-[#9EC7EE] bg-white px-6 py-3 text-[15px] font-semibold text-[#1877D2] transition-colors hover:bg-[#F0F7FE]"
          >
            Talk to Trudy
            <MessageCircle className="h-[17px] w-[17px]" />
          </Link>
        </div>

        <ul className="mt-7 flex flex-wrap gap-1.5 lg:w-[540px] lg:flex-nowrap xl:w-[580px]">
          {CHIPS.map(({ icon: Icon, tint, label }) => (
            <li
              key={label}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#E1EAF2] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#26455F]"
            >
              <Icon className={`h-4 w-4 shrink-0 ${tint}`} strokeWidth={2} />
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
