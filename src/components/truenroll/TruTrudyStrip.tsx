import { Link } from "react-router-dom";
import { ArrowRight, Lightbulb, Compass, BarChart3 } from "lucide-react";
import trudyWave from "@/assets/truenroll/trudy-wave.png";

const PROMISES = [
  { icon: Lightbulb, tint: "text-[#22B573]", label: "Explains plans simply" },
  { icon: Compass, tint: "text-[#1877D2]", label: "Guides self-enrollment" },
  { icon: BarChart3, tint: "text-[#EF4B3C]", label: "Helps you compare confidently" },
];

export const TruTrudyStrip = () => (
  <section className="mx-auto max-w-[1200px] px-5 pb-16 pt-10 lg:pb-20 lg:pt-16">
    <div className="relative rounded-[22px] border border-[#DDEEF6] bg-gradient-to-r from-[#EEF9F7] via-[#F3FAFD] to-[#F4F9FF] px-6 pb-8 pt-4 shadow-[0_18px_50px_-34px_rgba(15,43,70,0.5)] sm:px-8 lg:pb-9 lg:pt-7">
      <div className="grid items-center gap-6 lg:grid-cols-[240px_1fr_auto]">
        {/* Trudy deliberately breaks the top and bottom edges of the card */}
        <div className="relative h-[190px] sm:h-[210px] lg:h-full lg:min-h-[168px]">
          <img
            src={trudyWave}
            alt="Trudy, the TruEnroll enrollment assistant, waving"
            width={768}
            height={896}
            loading="lazy"
            className="pointer-events-none absolute -top-16 left-1/2 w-[210px] max-w-none -translate-x-1/2 drop-shadow-[0_22px_28px_rgba(15,43,70,0.18)] sm:w-[230px] lg:-top-24 lg:left-0 lg:w-[250px] lg:translate-x-0"
          />
        </div>

        <div className="lg:pr-4">
          <h2 className="text-[24px] font-bold leading-snug tracking-[-0.01em] text-[#0F2B46] sm:text-[28px]">
            Meet Trudy, your enrollment assistant
          </h2>
          <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-[#4C6980]">
            Trudy makes health coverage feel a lot less overwhelming. She explains terms in plain
            English, helps you compare options, and points you in the right direction. No pressure,
            ever.
          </p>
          <Link
            to="/ai-quote"
            className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-[#1877D2] transition-colors hover:text-[#125fa8]"
          >
            Start a conversation
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ul className="grid gap-3 sm:grid-cols-3 lg:w-[430px]">
          {PROMISES.map(({ icon: Icon, tint, label }) => (
            <li
              key={label}
              className="rounded-[16px] border border-[#E4F0F7] bg-white/90 px-4 py-4 text-center shadow-[0_10px_26px_-24px_rgba(15,43,70,0.5)]"
            >
              <Icon className={`mx-auto h-5 w-5 ${tint}`} strokeWidth={2} />
              <p className="mt-2.5 text-[13px] font-semibold leading-snug text-[#26455F]">{label}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
