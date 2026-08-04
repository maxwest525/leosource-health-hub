import { Sparkles, Send } from "lucide-react";
import trudy from "@/assets/truenroll/trudy.png";

const MESSAGES: { from: "trudy" | "user"; text: string }[] = [
  {
    from: "trudy",
    text: "Hi, I'm Trudy. Tell me what is going on with your coverage and I will walk you through the options.",
  },
  { from: "user", text: "I turn 65 in March and I still work part time." },
  {
    from: "trudy",
    text: "Good timing. Your enrollment window opens three months before your birthday. Let's check whether your employer plan counts as creditable coverage first.",
  },
];

const SUGGESTIONS = ["Am I eligible for a subsidy?", "Is my doctor covered?", "Compare two plans"];

export const TruChatPanel = () => (
  <div className="rounded-[22px] border border-[#E1EEF8] bg-white p-5 shadow-[0_24px_60px_-30px_rgba(15,43,70,0.35)]">
    <div className="flex items-center gap-3 border-b border-[#EEF4F9] pb-4">
      <img
        src={trudy}
        alt="Trudy, the TruEnroll coverage assistant"
        width={768}
        height={768}
        className="h-11 w-11 rounded-full bg-[#E6F6F4] object-cover object-top"
      />
      <div>
        <p className="text-[15px] font-semibold text-[#0F2B46]">Trudy</p>
        <p className="flex items-center gap-1.5 text-[12px] text-[#6B8AA3]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22B573]" />
          AI coverage guide, online now
        </p>
      </div>
      <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#EEF6FF] px-3 py-1 text-[11px] font-semibold text-[#1877D2]">
        <Sparkles className="h-3 w-3" />
        Live
      </span>
    </div>

    <div className="space-y-3 py-4">
      {MESSAGES.map((message, index) => (
        <div
          key={index}
          className={message.from === "user" ? "flex justify-end" : "flex justify-start"}
        >
          <p
            className={
              message.from === "user"
                ? "max-w-[78%] rounded-[16px] rounded-br-[6px] bg-[#1877D2] px-4 py-3 text-[13.5px] leading-relaxed text-white"
                : "max-w-[85%] rounded-[16px] rounded-bl-[6px] bg-[#F3F8FC] px-4 py-3 text-[13.5px] leading-relaxed text-[#26455F]"
            }
          >
            {message.text}
          </p>
        </div>
      ))}
    </div>

    <div className="flex flex-wrap gap-2 pb-4">
      {SUGGESTIONS.map((suggestion) => (
        <span
          key={suggestion}
          className="rounded-full border border-[#DCEAF6] px-3 py-1.5 text-[12px] font-medium text-[#41607A]"
        >
          {suggestion}
        </span>
      ))}
    </div>

    <div className="flex items-center gap-2 rounded-full border border-[#E1EEF8] bg-[#FAFCFE] px-4 py-2.5">
      <span className="flex-1 text-[13.5px] text-[#9AB0C2]">Ask about coverage, costs, or doctors</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1877D2]">
        <Send className="h-4 w-4 text-white" />
      </span>
    </div>
  </div>
);
