import { Link } from "react-router-dom";
import {
  ChevronRight,
  BookOpen,
  Target,
  Search,
  MessageCircle,
  Users,
  Heart,
  Radar,
} from "lucide-react";
import capitol from "@/assets/truenroll/capitol.png";
import doctor from "@/assets/truenroll/doctor.png";

const CENTERS = [
  {
    icon: BookOpen,
    title: "Resource Centers",
    body: "Learn the basics before you enroll.",
    to: "/resources",
    tint: "text-[#1877D2]",
  },
  {
    icon: Target,
    title: "Plan Matching",
    body: "Find options based on needs, budget, doctors, and prescriptions.",
    to: "/compare-plans",
    tint: "text-[#17A2A2]",
  },
  {
    icon: Search,
    title: "Plan Lookup",
    body: "Search real plan details quickly.",
    to: "/plan-lookup",
    tint: "text-[#7C5CD6]",
  },
  {
    icon: MessageCircle,
    title: "Live AI Guidance",
    body: "Ask questions in natural language and get simple explanations.",
    to: "/ai-quote",
    tint: "text-[#1CA9D6]",
  },
];

export const TruCenters = () => (
  <section className="mx-auto max-w-[1240px] px-5 py-14 lg:py-16">
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
          className="group flex items-start gap-3 rounded-[18px] border border-[#E6EFF6] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(15,43,70,0.5)] transition-all hover:-translate-y-1 hover:border-[#CFE3F4] hover:shadow-[0_20px_44px_-26px_rgba(15,43,70,0.45)]"
        >
          <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${tint}`} strokeWidth={2} />
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-bold text-[#0F2B46]">{title}</span>
            <span className="mt-1.5 block text-[13.5px] leading-relaxed text-[#5C7A91]">{body}</span>
          </span>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#9AB4C8] transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </div>
  </section>
);

export const TruSpotlights = () => (
  <section className="mx-auto grid max-w-[1240px] gap-5 px-5 lg:grid-cols-2">
    <article className="flex items-center gap-4 overflow-hidden rounded-[20px] border border-[#E1EEF8] bg-[#F4FAFF] px-6 py-5">
      <img
        src={capitol}
        alt="Illustration of a government capitol building"
        width={768}
        height={768}
        loading="lazy"
        className="hidden w-[130px] shrink-0 sm:block"
      />
      <div className="min-w-0">
        <h3 className="text-[19px] font-bold leading-snug text-[#0F2B46]">Medicare Resource Hub</h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5C7A91]">
          Learn Medicare basics, compare Original Medicare, Medicare Advantage, and Part D options.
        </p>
        <Link
          to="/medicare"
          className="mt-2.5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#1877D2] hover:text-[#125fa8]"
        >
          Explore Medicare
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </article>

    <article className="flex items-center gap-4 overflow-hidden rounded-[20px] border border-[#DFF1EE] bg-[#F1FAF8] px-6 py-5">
      <img
        src={doctor}
        alt="Illustration of a doctor holding a prescription clipboard"
        width={768}
        height={768}
        loading="lazy"
        className="hidden w-[130px] shrink-0 sm:block"
      />
      <div className="min-w-0">
        <h3 className="text-[19px] font-bold leading-snug text-[#0F2B46]">
          Doctor + Prescription Lookup
        </h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5C7A91]">
          Check if your doctors are in-network and your medications are covered before you enroll.
        </p>
        <Link
          to="/provider-search"
          className="mt-2.5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#17A2A2] hover:text-[#128484]"
        >
          Search Now
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  </section>
);

const TRUST = [
  {
    icon: Users,
    tint: "text-[#22B573]",
    title: "No sales hassle",
    body: "We don't sell plans. We empower you.",
  },
  {
    icon: Heart,
    tint: "text-[#1877D2]",
    title: "Consumer-first guidance",
    body: "Unbiased support focused on what's best for you.",
  },
  {
    icon: Radar,
    tint: "text-[#7C5CD6]",
    title: "Real-time data connections",
    body: "Direct CMS + HealthSherpa APIs for accurate, up-to-date info.",
  },
];

export const TruTrustBar = () => (
  <section className="mx-auto max-w-[1240px] px-5 py-8 lg:py-10">
    <div className="grid items-center gap-6 rounded-[20px] border border-[#E6EFF6] bg-white px-7 py-6 shadow-[0_14px_40px_-30px_rgba(15,43,70,0.5)] lg:grid-cols-[auto_1fr]">
      <h2 className="text-[24px] font-bold tracking-[-0.01em] text-[#0F2B46] lg:pr-8">
        More clarity. Less pressure.
      </h2>
      <ul className="grid gap-6 sm:grid-cols-3 lg:divide-x lg:divide-[#E6EFF6]">
        {TRUST.map(({ icon: Icon, tint, title, body }) => (
          <li key={title} className="flex items-start gap-3 lg:px-6 lg:first:pl-0 lg:last:pr-0">
            <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${tint}`} strokeWidth={2} />
            <div>
              <p className="text-[13.5px] font-bold text-[#0F2B46]">{title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#5C7A91]">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
);
