import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Sparkles, Search, MessageCircle, Stethoscope } from "lucide-react";
import capitol from "@/assets/truenroll/capitol.png";
import doctor from "@/assets/truenroll/doctor.png";

const CENTERS = [
  {
    icon: BookOpen,
    title: "Resource centers",
    body: "Plain-language guides for ACA, Medicare, and dental so you know the rules before you shop.",
    to: "/resources",
    tint: "text-[#1877D2]",
  },
  {
    icon: Sparkles,
    title: "Plan matching",
    body: "Answer a few questions and see the plans that fit your budget, doctors, and prescriptions.",
    to: "/compare-plans",
    tint: "text-[#17A2A2]",
  },
  {
    icon: Search,
    title: "Plan lookup",
    body: "Already have a plan in mind? Look it up by name or ID and read the real benefit details.",
    to: "/plan-lookup",
    tint: "text-[#EF8A3C]",
  },
  {
    icon: MessageCircle,
    title: "Live AI guidance",
    body: "Trudy answers coverage questions any time, and hands you to a licensed specialist on request.",
    to: "/ai-quote",
    tint: "text-[#6A5AE0]",
  },
];

export const TruCenters = () => (
  <section className="mx-auto max-w-[1200px] px-5 py-16 lg:py-20">
    <div className="max-w-[620px]">
      <h2 className="text-[32px] font-bold leading-tight tracking-[-0.02em] text-[#0F2B46] sm:text-[38px]">
        Everything you need to choose with confidence
      </h2>
      <p className="mt-4 text-[16.5px] leading-relaxed text-[#4C6980]">
        Research, compare, and verify in one place. Nothing is submitted until you say so.
      </p>
    </div>

    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {CENTERS.map(({ icon: Icon, title, body, to, tint }) => (
        <Link
          key={title}
          to={to}
          className="group rounded-[18px] border border-[#E6EFF6] bg-white p-6 shadow-[0_10px_30px_-24px_rgba(15,43,70,0.5)] transition-all hover:-translate-y-1 hover:border-[#CFE3F4] hover:shadow-[0_20px_44px_-26px_rgba(15,43,70,0.45)]"
        >
          <div className="flex items-center gap-2.5">
            <Icon className={`h-5 w-5 shrink-0 ${tint}`} strokeWidth={2} />
            <h3 className="text-[17px] font-semibold text-[#0F2B46]">{title}</h3>
          </div>
          <p className="mt-2.5 text-[14px] leading-relaxed text-[#5C7A91]">{body}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#1877D2]">

            Open
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      ))}
    </div>
  </section>
);

export const TruSpotlights = () => (
  <section className="mx-auto grid max-w-[1200px] gap-6 px-5 pb-16 lg:grid-cols-2 lg:pb-24">
    <article className="overflow-hidden rounded-[22px] border border-[#E1EEF8] bg-[#F4FAFF] p-8">
      <span className="inline-flex rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[#1877D2]">
        Medicare
      </span>
      <h3 className="mt-4 text-[26px] font-bold leading-snug tracking-[-0.01em] text-[#0F2B46]">
        Medicare resource hub
      </h3>
      <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-[#4C6980]">
        Parts A through D, Advantage versus Supplement, enrollment windows, and late penalties, explained
        without the jargon.
      </p>
      <Link
        to="/medicare"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1877D2] px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#1568bb]"
      >
        Explore Medicare
        <ArrowRight className="h-4 w-4" />
      </Link>
      <img
        src={capitol}
        alt="Illustration of a government capitol building"
        width={768}
        height={768}
        loading="lazy"
        className="ml-auto -mb-8 mt-2 block w-[220px]"
      />
    </article>

    <article className="overflow-hidden rounded-[22px] border border-[#DFF1EE] bg-[#F1FAF8] p-8">
      <span className="inline-flex rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[#17A2A2]">
        Verify first
      </span>
      <h3 className="mt-4 text-[26px] font-bold leading-snug tracking-[-0.01em] text-[#0F2B46]">
        Doctor and prescription lookup
      </h3>
      <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-[#4C6980]">
        Check that your physician is in network and your medications are on the formulary before you
        enroll, not after.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/provider-search"
          className="inline-flex items-center gap-2 rounded-full bg-[#17A2A2] px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#148f8f]"
        >
          <Stethoscope className="h-4 w-4" />
          Find a doctor
        </Link>
        <Link
          to="/find-prescriptions"
          className="inline-flex items-center gap-2 rounded-full border border-[#BEE2DE] bg-white px-6 py-3 text-[14px] font-semibold text-[#17A2A2] transition-colors hover:bg-[#EAF7F5]"
        >
          Check a prescription
        </Link>
      </div>
      <img
        src={doctor}
        alt="Illustration of a doctor holding a prescription clipboard"
        width={768}
        height={768}
        loading="lazy"
        className="ml-auto -mb-8 mt-2 block w-[200px]"
      />
    </article>
  </section>
);
