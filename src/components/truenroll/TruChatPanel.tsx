import { Volume2, MoreVertical, Send, Check } from "lucide-react";
import trudy from "@/assets/truenroll/trudy.png";
import userAvatar from "@/assets/truenroll/user-avatar.jpg";

type Message = {
  from: "trudy" | "user";
  text: string;
  time: string;
  linkLabel?: string;
  intro?: string;
  bullets?: string[];
  outro?: string;
};

const MESSAGES: Message[] = [
  {
    from: "user",
    text: "Hi Trudy! I'm self-employed and make around $45k a year. What health coverage options do I have?",
    time: "10:32 AM",
  },
  {
    from: "trudy",
    text: "Great question! Based on your income, you may qualify for savings through the",
    linkLabel: "ACA Marketplace.",
    intro: "You can explore:",
    bullets: [
      "Marketplace plans with potential subsidies",
      "Catastrophic plans (if you're under 30)",
      "Short-term plans (limited duration)",
    ],
    outro: "Shall I show you plan options in your area?",
    time: "10:32 AM",
  },
];

export const TruChatPanel = () => (
  <div className="overflow-hidden rounded-[18px] border border-[#E1EEF8] bg-white shadow-[0_28px_70px_-34px_rgba(15,43,70,0.45)]">
    {/* Header */}
    <div className="flex items-center gap-3 border-b border-[#EEF4F9] px-5 py-4">
      <img
        src={trudy}
        alt="Trudy, the TruEnroll coverage assistant"
        width={768}
        height={768}
        className="h-11 w-11 rounded-full bg-[#E6F6F4] object-cover object-top"
      />
      <div>
        <p className="text-[17px] font-bold leading-tight text-[#0F2B46]">Trudy</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] font-medium text-[#22B573]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22B573]" />
          Online
        </p>
      </div>
      <div className="ml-auto flex items-center gap-3 text-[#8FA9BE]">
        <Volume2 className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
        <MoreVertical className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
      </div>
    </div>

    {/* Transcript */}
    <div className="space-y-4 px-5 py-5">
      {MESSAGES.map((message, index) =>
        message.from === "user" ? (
          <div key={index} className="flex items-start justify-end gap-2.5">
            <div className="max-w-[76%]">
              <p className="rounded-[12px] border border-[#E4EFF8] bg-white px-3.5 py-2.5 text-[13px] leading-[1.5] text-[#26455F] shadow-[0_6px_18px_-14px_rgba(15,43,70,0.6)]">
                {message.text}
              </p>
              <p className="mt-1.5 text-right text-[11px] text-[#9AB0C2]">{message.time}</p>
            </div>
            <img
              src={userAvatar}
              alt=""
              width={512}
              height={512}
              loading="lazy"
              className="mt-0.5 h-9 w-9 shrink-0 rounded-full object-cover"
            />
          </div>
        ) : (
          <div key={index} className="flex items-start gap-2.5">
            <img
              src={trudy}
              alt=""
              width={768}
              height={768}
              loading="lazy"
              className="mt-0.5 h-9 w-9 shrink-0 rounded-full bg-[#E6F6F4] object-cover object-top"
            />
            <div className="max-w-[82%]">
              <div className="rounded-[12px] border border-[#E4EFF8] bg-[#FBFDFE] px-3.5 py-3 text-[13px] leading-[1.5] text-[#26455F]">
                <p>
                  {message.text}{" "}
                  <span className="font-medium text-[#1877D2] underline decoration-[#9EC7EE] underline-offset-2">
                    {message.linkLabel}
                  </span>
                </p>
                <p className="mt-3">{message.intro}</p>
                <ul className="mt-2 space-y-1.5">
                  {message.bullets?.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[#22B573]" strokeWidth={3} />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3">{message.outro}</p>
              </div>
              <p className="mt-1.5 text-[11px] text-[#9AB0C2]">{message.time}</p>
            </div>
          </div>
        ),
      )}
    </div>

    {/* Composer */}
    <div className="px-5 pb-5">
      <div className="flex items-center gap-2 rounded-full border border-[#E1EEF8] bg-white py-1.5 pl-5 pr-1.5">
        <span className="flex-1 text-[13px] text-[#9AB0C2]">
          Ask Trudy anything about health coverage...
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877D2]">
          <Send className="h-[17px] w-[17px] text-white" strokeWidth={2} />
        </span>
      </div>
    </div>
  </div>
);
