import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Lock, Star } from "lucide-react";
import { TruChatPanel } from "./TruChatPanel";
import landscape from "@/assets/truenroll/hero-landscape.jpg";

const PROOF = [
  { icon: ShieldCheck, label: "Licensed in 42 states" },
  { icon: Lock, label: "Your data stays private" },
  { icon: Star, label: "No pressure, no spam calls" },
];

export const TruHero = () => (
  <section className="relative overflow-hidden bg-gradient-to-b from-[#F2F9FE] via-[#F7FBFD] to-white">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[220px] bg-cover bg-bottom opacity-40 [mask-image:linear-gradient(to_top,black,transparent)]"
      style={{ backgroundImage: `url(${landscape})` }}
    />
    <div className="relative mx-auto grid max-w-[1200px] items-center gap-14 px-5 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#CFE6F8] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#1877D2]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#17A2A2]" />
          ACA, Medicare, dental and vision in one place
        </span>

        <h1 className="mt-6 text-[42px] font-bold leading-[1.08] tracking-[-0.02em] text-[#0F2B46] sm:text-[54px]">
          Understand your coverage.
          <br />
          <span className="text-[#1877D2]">Enroll on your own terms.</span>
        </h1>

        <p className="mt-5 max-w-[520px] text-[17px] leading-[1.65] text-[#4C6980]">
          Ask questions in plain language, see the plans you actually qualify for, and check that your
          doctors and prescriptions are covered before you commit to anything.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/ai-quote"
            className="inline-flex items-center gap-2 rounded-full bg-[#EF4B3C] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_30px_-12px_rgba(239,75,60,0.8)] transition-colors hover:bg-[#df3f30]"
          >
            Ask Trudy a question
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/compare-plans"
            className="inline-flex items-center gap-2 rounded-full border border-[#BFD9F0] bg-white px-7 py-3.5 text-[15px] font-semibold text-[#1877D2] transition-colors hover:bg-[#F0F7FE]"
          >
            Browse plans
          </Link>
        </div>

        <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-3">
          {PROOF.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-[13.5px] font-medium text-[#5C7A91]">
              <Icon className="h-4 w-4 text-[#17A2A2]" />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <TruChatPanel />
    </div>
  </section>
);
